import {
    actionArgFromUnknown,
    GameStatePlugin,
    Logger,
    PluginConfig,
    PluginDispatchFunc,
    Sandbox,
} from '@downstream/core';
import * as Comlink from 'comlink';
import { QuickJSContext, QuickJSRuntime, getQuickJS } from 'quickjs-emscripten';
import { ethers } from 'ethers';

let runtime: QuickJSRuntime;

const contexts: QuickJSContext[] = [];

let pollPendingJobsTimeout;

// wrapper functions loaded by the fake 'downstream' module within the guest
// to make it feel like a "normal" library import and potentially keep compatibility
// with any future implementation changes where modules loading might be supported
const DS_GUEST_FUNCTIONS = `

export function dispatch(...actions) {
    const req = JSON.stringify(actions);
    return globalThis.__ds.dispatch(req);
}

export function encodeCall(...args) {
    const req = JSON.stringify(args);
    return JSON.parse(globalThis.__ds.encodeCall(req));
}

export function log(...args) {
    const req = JSON.stringify(args);
    return globalThis.__ds.log(req);
}

export function sendQuestMessage(...args) {
    const req = JSON.stringify(args);
    return globalThis.__ds.sendQuestMessage(req);
}

export default {
    encodeCall,
    dispatch,
    log,
    sendQuestMessage,
};
`;

function pollPendingJobs() {
    if (runtime && runtime.hasPendingJob()) {
        runtime.executePendingJobs(1);
    }
    const ms = runtime.hasPendingJob() ? 0 : 100;
    pollPendingJobsTimeout = setTimeout(() => pollPendingJobs(), ms);
}

export async function init() {
    const qjs = await getQuickJS();

    runtime = qjs.newRuntime();
    // runtime.setMemoryLimit(1024 * 640);
    runtime.setMemoryLimit(46000);
    runtime.setMaxStackSize(1024 * 320);

    pollPendingJobs();

    // let interruptCycles = 0;
    // runtime.setInterruptHandler(() => {
    //     console.log('int');
    //     return ++interruptCycles > 1024;
    // });
}

export async function disposeRuntime() {
    // renamed branch
    if (!runtime) return;
    console.log('runtime before: ', await runtime.dumpMemoryUsage());
    console.log('%c DISPOSING CONTEXTS & RUNTIME...', 'background: #222; color: #bada55');
    const disposeContextPromises = contexts.map((ctx) => {
        return new Promise((resolve, reject) => {
            try {
                ctx.dispose();
                resolve(ctx);
            } catch (err) {
                reject(err);
            }
        });
    });

    try {
        await Promise.all(disposeContextPromises);
        console.log('%c contexts disposed successfully...', 'background: #222; color: #bada55');
    } catch (err) {
        console.error('Error disposing contexts: ', err);
    }
    //contexts = [];

    try {
        //clearTimeout(pollPendingJobsTimeout);
        //console.log('%c cleared pending jobs timeout (remove this later?)...', 'background: #222; color: #bada55');
    } catch (err) {
        console.error('Error clearing pollPendingJobs timeout: ', err);
    }
    try {
        await init();
        console.log('%c runtime re-initialized successfully...', 'background: #222; color: #bada55');
    } catch (err) {
        console.error('Error disposing runtime: ', err);
    }

    console.log('runtime after: ', await runtime.dumpMemoryUsage());
}

// can also die at update time
export async function setState(newState: GameStatePlugin, newBlock: number) {
    //console.log(runtime.dumpMemoryUsage());
    contexts.forEach(async (context) => {
        if (context && context.alive) {
            // try {
            //     context.dispose();
            //     console.log(`Disposed context `, context);
            // } catch (err) {
            //     console.error(`Error disposing context `, context, err);
            // }
        }
        if (context && context.alive) {
            try {
                context.evalCode(`
                globalThis.__state = ${JSON.stringify(newState)};
                globalThis.__block = ${newBlock};
            `);
            } catch (err) {
                if (String(err).includes('memory access out of bounds')) {
                    // Now try to dispose contexts/runtime?
                    try {
                        await disposeRuntime();
                        return;
                    } catch (errr) {
                        console.error('Could not dispose... ', errr);
                    }
                }
            }
        }
    });
}

export function deleteContext(contextID: number) {
    try {
        contexts[contextID].dispose();
        console.log('just disposed context ', contextID);
    } catch (err) {
        console.error(`error disposing context ${contextID} `, err);
    }
}

export async function hasContext(contextID: number) {
    const context = contexts[contextID];
    return context?.alive;
}

export async function evalCode(contextID: number, code: string) {
    const context = contexts[contextID];
    if (!context || !context.alive) {
        return;
    }
    const res = context.evalCode(code);
    const promiseHandle = context.unwrapResult(res);
    // Convert the promise handle into a native promise and await it.
    // If code like this deadlocks, make sure you are calling
    // runtime.executePendingJobs appropriately.
    const resolvedResult = await context.resolvePromise(promiseHandle);
    promiseHandle.dispose();
    try {
        const resolvedHandle = context.unwrapResult(resolvedResult);
        const responseJSON = context.getString(resolvedHandle);
        resolvedHandle.dispose();
        return JSON.parse(responseJSON);
    } catch (err) {
        console.error('plugin did not return an expected response object:', err);
        if (String(err).includes('memory')) {
            try {
                await disposeRuntime();
                return;
            } catch (errr) {
                console.error('Could not dispose... ', errr);
            }
        }
        return {};
    }
}

export async function newContext(
    dispatch: PluginDispatchFunc,
    logMessage: Logger,
    questMessage: Logger,
    config: PluginConfig
): Promise<number> {
    const api = { enabled: true }; // TODO: do we need to restrict this again?

    const context = runtime.newContext();
    contexts.push(context);
    const contextID = contexts.length - 1;

    // create the global __ds object where we stick all
    // the bridging functions
    const dsHandle = context.newObject();

    // setup the dispatch binding
    context
        .newFunction('dispatch', (reqHandle) => {
            try {
                if (!api.enabled) {
                    console.warn(`plugin-${config.id}: cannot dispatch outside of event handler`);
                    return context.undefined;
                }
                const actions = JSON.parse(context.getString(reqHandle));
                if (typeof actions === 'undefined' || !Array.isArray(actions)) {
                    console.warn(`plugin-${config.id}: invalid dispatch call`, actions);
                    return context.undefined;
                }
                dispatch(...actions)
                    .then(() => console.log(`plugin-${config.id}: dispatched`, actions))
                    .catch((err) => console.error(`plugin-${config.id}: failed dispatch: ${err}`));
                return context.newString('ok'); // TODO: return queue id
            } catch (err) {
                console.error(`plugin-${config.id}: failure attempting to dispatch: ${err}`);
                return context.undefined;
            }
        })
        .consume((fn: any) => context.setProp(dsHandle, 'dispatch', fn));

    // expose a way for plugins to do some calldata encoding
    // TODO: we basically want an "ethers lite" for plugins and other utils, binding just this func is not gonna be enough
    context
        .newFunction('encodeCall', (reqHandle) => {
            try {
                if (!api.enabled) {
                    console.warn(`plugin-${config.id}: api disabled outside of event handlers`);
                    return context.undefined;
                }
                const [funcsig, args] = JSON.parse(context.getString(reqHandle));
                const callInterface = new ethers.Interface([funcsig]);
                const callFunc = callInterface.getFunction(funcsig);
                if (!callFunc) {
                    throw new Error(`no func found for signature ${funcsig}`);
                }
                const callArgs = callFunc.inputs.map((wanted, idx) => actionArgFromUnknown(wanted, args[idx]));
                const callData = callInterface.encodeFunctionData(callFunc.name, callArgs);
                return context.newString(JSON.stringify(callData));
            } catch (err) {
                console.error(`plugin-${config.id}: failure attempting to encodeCall: ${err}`);
                return context.undefined;
            }
        })
        .consume((fn: any) => context.setProp(dsHandle, 'encodeCall', fn));

    // setup the log binding
    context
        .newFunction('log', (reqHandle) => {
            try {
                if (!api.enabled) {
                    console.warn(`plugin-${config.id}: ds api is unavilable outside of event handlers`);
                    return context.undefined;
                }
                const args = JSON.parse(context.getString(reqHandle));
                logMessage.log(...args);
            } catch (err) {
                console.error(`plugin-${config.id}: error while attempting to deliver log message: ${err}`);
            }
            return context.undefined;
        })
        .consume((fn: any) => context.setProp(dsHandle, 'log', fn));

    // setup quest message
    context
        .newFunction('sendQuestMessage', (reqHandle) => {
            try {
                if (!api.enabled) {
                    console.warn(`plugin-${config.id}: ds api is unavilable outside of event handlers`);
                    return context.undefined;
                }
                const [message] = JSON.parse(context.getString(reqHandle));
                questMessage.log(message);
            } catch (err) {
                console.error(`plugin-${config.id}: error while attempting to send quest message: ${err}`);
            }
            return context.undefined;
        })
        .consume((fn: any) => context.setProp(dsHandle, 'sendQuestMessage', fn));

    // attach the __ds proxy to global object
    context.setProp(context.global, '__ds', dsHandle);
    dsHandle.dispose();

    //// console.log
    const consoleHandle = context.newObject();

    const infoHandle = context.newFunction('info', (...args) => {
        const nativeArgs = args.map(context.dump);
        console.info(...nativeArgs);
    });
    context.setProp(consoleHandle, 'info', infoHandle);

    const logHandle = context.newFunction('log', (...args) => {
        const nativeArgs = args.map(context.dump);
        console.log(...nativeArgs);
    });
    context.setProp(consoleHandle, 'log', logHandle);

    const warnHandle = context.newFunction('warn', (...args) => {
        const nativeArgs = args.map(context.dump);
        console.warn(...nativeArgs);
    });
    context.setProp(consoleHandle, 'warn', warnHandle);

    const errorHandle = context.newFunction('error', (...args) => {
        const nativeArgs = args.map(context.dump);
        console.error(...nativeArgs);
    });
    context.setProp(consoleHandle, 'error', errorHandle);

    const debugHandle = context.newFunction('debug', (...args) => {
        const nativeArgs = args.map(context.dump);
        console.debug(...nativeArgs);
    });
    context.setProp(consoleHandle, 'debug', debugHandle);

    context.setProp(context.global, 'console', consoleHandle);
    consoleHandle.dispose();
    infoHandle.dispose();
    logHandle.dispose();
    warnHandle.dispose();
    errorHandle.dispose();
    debugHandle.dispose();

    // expose fetch api
    // this is not the full fetch API... it's just enough to do:
    //
    //  // GET some json from a url
    //  const data = await fetch(url).then(res => res.json())
    //
    //  // GET some text from a url
    //  const txt = await fetch(url).then(res => res.text())
    //
    //  // POST some json data to a url and check status
    //  const ok = await fetch(url, {method: 'POST', body: JSON.stringify({})}).then(res => res.ok);
    //
    // but the bits that are supported are following the fetch api
    // so we may support more of the api in the future
    const fetchHandle = context.newFunction('fetch', (pathHandle, optsHandle) => {
        if (!pathHandle) {
            throw new Error('first arg to fetch should be a url string');
        }
        const path = context.getString(pathHandle);
        const optsDump =
            optsHandle && optsHandle !== context.undefined && optsHandle !== context.null
                ? context.dump(optsHandle)
                : {};
        const unsafeOpts = typeof optsDump === 'object' ? optsDump : {};
        const allowedOpts: RequestInit = {};
        if (unsafeOpts.method) {
            allowedOpts.method = unsafeOpts.method;
        }
        if (unsafeOpts.body) {
            allowedOpts.body = unsafeOpts.body;
        }
        if (unsafeOpts.headers) {
            if (typeof unsafeOpts.headers['Content-Type'] == 'string') {
                allowedOpts.headers = {
                    'Content-Type': unsafeOpts.headers['Content-Type'],
                };
            }
        }
        const opts: RequestInit = { method: 'GET', ...allowedOpts };
        const promise = context.newPromise();
        // TODO: add a strict AbortController to force plugins to make fast requests
        fetch(path, opts)
            .then((res) => {
                const resObj = context.newObject();

                context.newNumber(res.status).consume((handle) => context.setProp(resObj, 'status', handle));
                context.newString(res.statusText).consume((handle) => context.setProp(resObj, 'statusText', handle));
                context.setProp(resObj, 'ok', res.ok ? context.true : context.false);

                context
                    .newFunction('json', () => {
                        const p = context.newPromise();
                        res.json()
                            .then((json) => {
                                const bodyJSON = context.evalCode(`((json) => json)(${JSON.stringify(json)})`);
                                const bodyJSONHandle = context.unwrapResult(bodyJSON);
                                p.resolve(bodyJSONHandle);
                                bodyJSONHandle.dispose();
                            })
                            .catch((err) => console.error(err));
                        p.settled.then(context.runtime.executePendingJobs).catch((err) => console.error(err));
                        return p.handle;
                    })
                    .consume((handle) => context.setProp(resObj, 'json', handle));

                context
                    .newFunction('text', () => {
                        const p = context.newPromise();
                        res.text()
                            .then((txt) => {
                                p.resolve(context.newString(txt || ''));
                            })
                            .catch((err) => console.error(err));
                        p.settled.then(context.runtime.executePendingJobs).catch((err) => console.error(err));
                        return p.handle;
                    })
                    .consume((handle) => context.setProp(resObj, 'text', handle));

                promise.resolve(resObj);
                resObj.dispose();
            })
            .catch((err) => {
                console.error(`[plugin ${config.name}] fetch: ${err}`);
                // TODO: return proper Error not string
                promise.reject(context.newString(`${err}`));
            });
        promise.settled.then(context.runtime.executePendingJobs).catch((err) => console.error(err));
        return promise.handle;
    });
    fetchHandle.consume((handle) => context.setProp(context.global, 'fetch', handle));

    // setup the module loader for the magic imports
    runtime.setModuleLoader((moduleName) => {
        switch (moduleName) {
            case '__plugin__':
                return config.src;
            case 'downstream':
                return DS_GUEST_FUNCTIONS;
            default:
                throw new Error('importing modules is only available for downstream module');
        }
    });

    // load the untrusted src via the module loader
    const ok = context.evalCode(
        `
            import update from '__plugin__';
            globalThis.__state = {};
            globalThis.__block = 0;
            globalThis.__update = async () => {
                const res = await Promise.resolve(update(globalThis.__state, globalThis.__block));

                // replace funcs with refs
                const refs = {};
                if (!res) {
                    res = {};
                }
                if (res.components) {
                    res.components.forEach(comp => {
                        if (!comp.content || !comp.content.forEach) {
                            return;
                        }
                        comp.content.forEach(cont => {
                            if (!cont.id) {
                                return;
                            }
                            if (typeof cont.submit === 'function') {
                                const ref = Math.random().toString(36);
                                if (refs[ref]) {
                                    throw new Error('bang, need better ref picker');
                                }
                                refs[ref] = cont.submit;
                                cont.submit = ref;
                            }
                            if (!cont.buttons || !cont.buttons.forEach) {
                                return;
                            }
                            cont.buttons.forEach((btn,idx) => {
                                if (typeof btn.action === 'function') {
                                    const ref = comp.id+'/'+cont.id+'/'+idx;
                                    if (refs[ref]) {
                                        throw new Error('bang, need better ref picker');
                                    }
                                    refs[ref] = btn.action;
                                    btn.action = ref;
                                }
                            })
                        });
                    });
                }

                // stick the refs somewhere we can find them later
                globalThis.__refs = refs;

                return JSON.stringify(res);
            };
        `
    );
    context.unwrapResult(ok).consume(context.getString);

    return contextID;
}

const sandbox: Sandbox = { init, disposeRuntime, newContext, deleteContext, hasContext, evalCode, setState };

Comlink.expose(sandbox);

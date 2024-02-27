import {
    actionArgFromUnknown,
    GameStatePlugin,
    Logger,
    PluginConfig,
    PluginDispatchFunc,
    Sandbox,
    GameConfig,
    PluginUpdateResponse,
} from '@downstream/core';
import * as Comlink from 'comlink';
import { QuickJSContext, QuickJSRuntime, getQuickJS } from 'quickjs-emscripten';
import { AbiCoder, ethers, keccak256, solidityPackedKeccak256 } from 'ethers';

let runtime: QuickJSRuntime;
let config: Partial<GameConfig> = {};

const contexts: QuickJSContext[] = [];

// wrapper functions loaded by the fake 'downstream' module within the guest
// to make it feel like a "normal" library import and potentially keep compatibility
// with any future implementation changes where modules loading might be supported
const DS_GUEST_FUNCTIONS = () => `

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

export function solidityPackedKeccak256(...args) {
    const req = JSON.stringify(args);
    return globalThis.__ds.solidityPackedKeccak256(req);
}

export function keccak256(...args) {
    const req = JSON.stringify(args);
    return globalThis.__ds.keccak256(req);
}

export function abiEncode(...args) {
    const req = JSON.stringify(args);
    return globalThis.__ds.abiEncode(req);
}

export function abiDecode(...args) {
    const req = JSON.stringify(args);
    return globalThis.__ds.abiDecode(req);
}

export const config = ${JSON.stringify(config)};

export default {
    encodeCall,
    dispatch,
    log,
    sendQuestMessage,
    config,
    solidityPackedKeccak256,
    keccak256,
    abiEncode,
    abiDecode

};
`;

function pollPendingJobs() {
    if (runtime && runtime.hasPendingJob()) {
        runtime.executePendingJobs(1);
    }
    const ms = runtime.hasPendingJob() ? 0 : 100;
    setTimeout(() => pollPendingJobs(), ms);
}

async function init(cfg: Partial<GameConfig>) {
    config = cfg;
    const qjs = await getQuickJS();

    runtime = qjs.newRuntime();
    runtime.setMemoryLimit(256 * 1024 * 1024);
    runtime.setMaxStackSize(1024 * 320);

    pollPendingJobs();
}

// can also die at update time
async function setState(newState: GameStatePlugin, newBlock: number) {
    contexts.forEach(async (context) => {
        if (context && context.alive) {
            try {
                context.evalCode(`
                globalThis.__state = ${JSON.stringify(newState)};
                globalThis.__block = ${newBlock};
            `);
            } catch (err) {
                if (String(err).includes('memory access out of bounds')) {
                    throw new Error('SANDBOX_OOM');
                }
            }
        }
    });
}

async function deleteContext(contextID: number) {
    try {
        contexts[contextID].dispose();
        console.log('just disposed context ', contextID);
    } catch (err) {
        console.error(`error disposing context ${contextID} `, err);
    }
}

async function hasContext(contextID: number) {
    const context = contexts[contextID];
    return context?.alive;
}

async function evalCode(contextID: number, code: string) {
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
        if (String(err).includes('out of memory')) {
            throw new Error('SANDBOX_OOM');
        }
        return {};
    }
}

async function newContext(
    dispatch: PluginDispatchFunc,
    logMessage: Logger,
    questMessage: Logger,
    config: PluginConfig
): Promise<number> {
    try {
        return _newContext(dispatch, logMessage, questMessage, config);
    } catch (err) {
        // So far haven't hit this error - need to trigger the memory error to make the .includes('memory') more specific
        // (it should be more like 'memory access out of bounds' or 'out of memory')
        if (String(err).includes('memory')) {
            console.error('This error message needs to be in the .includes part of the if statement: ', err);
            throw new Error('SANDBOX_OOM');
        } else {
            throw err;
        }
    }
}
async function _newContext(
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

    // expose keccack256 function
    context
        .newFunction('solidityPackedKeccak256', (reqHandle) => {
            try {
                if (!api.enabled) {
                    console.warn(`plugin-${config.id}: ds api is unavilable outside of event handlers`);
                    return context.undefined;
                }
                const [types, values] = JSON.parse(context.getString(reqHandle));
                const res = solidityPackedKeccak256(types, values);
                return context.newString(res);
            } catch (err) {
                console.error(`plugin-${config.id}: error while attempting to solidityPackedKeccak256: ${err}`);
            }
            return context.undefined;
        })
        .consume((fn: any) => context.setProp(dsHandle, 'solidityPackedKeccak256', fn));

    // expose keccack256 function
    context
        .newFunction('keccak256', (reqHandle) => {
            try {
                if (!api.enabled) {
                    console.warn(`plugin-${config.id}: ds api is unavilable outside of event handlers`);
                    return context.undefined;
                }
                const [bytesHex] = JSON.parse(context.getString(reqHandle));
                const res = keccak256(bytesHex);
                return context.newString(res);
            } catch (err) {
                console.error(`plugin-${config.id}: error while attempting to keccak256: ${err}`);
            }
            return context.undefined;
        })
        .consume((fn: any) => context.setProp(dsHandle, 'keccak256', fn));

    // expose encode function
    context
        .newFunction('abiEncode', (reqHandle) => {
            try {
                if (!api.enabled) {
                    console.warn(`plugin-${config.id}: ds api is unavilable outside of event handlers`);
                    return context.undefined;
                }
                const [types, values] = JSON.parse(context.getString(reqHandle));
                const coder = AbiCoder.defaultAbiCoder();
                const res = coder.encode(types, values);
                return context.newString(res);
            } catch (err) {
                console.error(`plugin-${config.id}: error while attempting to abiEncode: ${err}`);
            }
            return context.undefined;
        })
        .consume((fn: any) => context.setProp(dsHandle, 'abiEncode', fn));

    // expose encode function
    context
        .newFunction('abiDecode', (reqHandle) => {
            try {
                if (!api.enabled) {
                    console.warn(`plugin-${config.id}: ds api is unavilable outside of event handlers`);
                    return context.undefined;
                }
                const [types, data] = JSON.parse(context.getString(reqHandle));
                const coder = AbiCoder.defaultAbiCoder();
                const res = coder.decode(types, data);
                return context.newString(JSON.stringify(res));
            } catch (err) {
                console.error(`plugin-${config.id}: error while attempting to abiDecode: ${err}`);
            }
            return context.undefined;
        })
        .consume((fn: any) => context.setProp(dsHandle, 'abiDecode', fn));

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
                return DS_GUEST_FUNCTIONS();
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

async function update(contextId: number): Promise<PluginUpdateResponse> {
    return await evalCode(
        contextId,
        `(async () => {
            return globalThis.__update();
        })()`
    );
}

async function submit(contextId: number, data: { ref: string; values: any }): Promise<void> {
    await evalCode(
        contextId,
        `(async function({ref, values}){
            const fn = globalThis.__refs[ref];
            fn && fn(values);
            return JSON.stringify({ok: true});
        })(${JSON.stringify(data)})`
    );
}

const sandbox: Sandbox = { init, newContext, deleteContext, hasContext, setState, update, submit };

Comlink.expose(sandbox);

import { ethers } from 'ethers';
import { getQuickJS, QuickJSRuntime } from 'quickjs-emscripten';
import {
    concat,
    fromPromise,
    fromValue,
    lazy,
    makeSubject,
    map,
    mergeMap,
    pipe,
    share,
    Source,
    switchMap,
    throttle,
    zip,
} from 'wonka';
import * as apiv1 from './api/v1';
import { actionArgFromUnknown } from './cog';
import { AvailablePluginFragment, GetAvailablePluginsDocument, GetSelectedPluginsDocument } from './gql/graphql';
import { Logger } from './logger';
import {
    ActivePlugin,
    CogAction,
    CogServices,
    DispatchFunc,
    GameState,
    PluginConfig,
    PluginSubmitCallValues,
    PluginTrust,
    PluginType,
    PluginUpdateResponse,
    QueuedSequencerAction,
    Selection,
} from './types';

const gruntime = getQuickJS().then((js) => js.newRuntime());
const active = new Map<string, ActivePlugin>();

export function makePluginSandbox() {
    return pipe(
        fromPromise(gruntime),
        map((runtime) => ({ runtime, active })),
    );
}

/**
 * makeAvailablePlugins polls for the list of deployed plugins every now and
 * then (60s).
 *
 * we don't fetch on every subscription notification because this list could be
 * large and is not important that it is right up to date.
 *
 */
export function makeAvailablePlugins(client: Source<CogServices>) {
    const plugins = pipe(
        client,
        switchMap(({ query, gameID }) =>
            pipe(
                query(GetAvailablePluginsDocument, { gameID }, { poll: 60 * 1000 }),
                map(({ game }) => game.state.plugins),
            ),
        ),
    );
    return { plugins };
}

/**
 * noopDispatcher throws away dispatch calls and just logs them. it is used
 * when a plugin attempts to call dispatch but there is no connected player to
 * dispatch for.
 */
async function noopDispatcher(..._actions: CogAction[]): Promise<QueuedSequencerAction> {
    throw new Error('dispatch failed: attempt to dispatch without a connected player');
}

/**
 * makePluginUI sends the current State to each wanted plugin and returns a
 * stream of all the normalized plugin responses.
 */
export function makePluginUI(
    logger: Logger,
    plugins: Source<PluginConfig[]>,
    state: Source<GameState>,
    block: Source<number>,
) {
    const sandbox = makePluginSandbox();
    return pipe(
        zip<any>({ sandbox, plugins, state, block }),
        throttle<any>(() => 1000),
        map<any, Promise<PluginUpdateResponse>[]>(
            ({
                sandbox,
                state,
                plugins,
                block,
            }: {
                sandbox: { runtime: QuickJSRuntime; active: Map<string, ActivePlugin> };
                state: GameState;
                plugins: PluginConfig[];
                block: number;
            }) => {
                const statePromises = plugins
                    .map((p) => {
                        try {
                            const { player } = state;
                            const dispatch = player ? player.dispatch : noopDispatcher;
                            if (!p.hash || !p.src) {
                                console.warn(`plugin ${p.id} has no src hash, skipping`);
                                return null;
                            }
                            const plugin = active.has(p.hash)
                                ? active.get(p.hash)
                                : loadPlugin(sandbox.runtime, dispatch, logger.with({ name: `plugin-${p.id}` }), p);
                            if (!plugin) {
                                console.warn(`failed to get or load plugin ${p.id}`);
                                return null;
                            }
                            active.set(p.hash, plugin);
                            return plugin.update(state, block);
                        } catch (err) {
                            console.error(`plugin ${p.id}:`, err);
                            return Promise.resolve({ components: [], version: 1, error: `${err}` });
                        }
                    })
                    .filter((res): res is Promise<PluginUpdateResponse> => !!res);
                sandbox.runtime.executePendingJobs();
                return statePromises;
            },
        ),
        mergeMap((statePromises) => fromPromise(Promise.all(statePromises))),
        share,
    );
}

function isAutoloadableBuildingPlugin(p: AvailablePluginFragment, { tiles, mobileUnit }: Selection) {
    if (!p.supports) {
        return false;
    }
    if (!p.supports.metadata) {
        // FIXME: use src annotation not metadata
        return false;
    }
    switch (pluginTypeForNodeKind(p.supports.kind)) {
        case PluginType.BUILDING:
            if (!tiles) {
                return false;
            }
            if (tiles.length !== 1) {
                return false;
            }
            const selectedTile = tiles.find(() => true);
            if (!selectedTile) {
                return false;
            }
            const selectedBuilding = selectedTile.building;
            if (!selectedBuilding) {
                return false;
            }
            return p.supports.id == selectedBuilding.kind?.id;
        case PluginType.ITEM:
            if (!mobileUnit) {
                return false;
            }
            const unitItemKindIds = mobileUnit.bags.flatMap((b) => b.bag.slots.flatMap((slot) => slot.item.id));
            return unitItemKindIds.some((id) => p.supports?.id === id);
        default:
            return false;
    }
}

/**
 * makeAutoloadBuildingPlugins filters source of available plugin configs down to only those relevent to
 * currently selected tile.
 */
function makeAutoloadBuildingPlugins(
    cog: CogServices,
    availablePlugins: Source<AvailablePluginFragment[]>,
    selected: Selection,
) {
    return pipe(
        availablePlugins,
        map((plugins) => plugins.filter((p) => isAutoloadableBuildingPlugin(p, selected))),
        switchMap((plugins) =>
            makeSelectedPlugins(
                cog,
                plugins.map((p) => p.id),
            ),
        ),
    );
}

/**
 * makeAutoloadPlugins returns a source of available plugin configs that are selected
 * based on the current selection state
 */
export function makeAutoloadPlugins(
    cog: Source<CogServices>,
    availablePlugins: Source<AvailablePluginFragment[]>,
    selection: Source<Selection>,
) {
    const plugins: Source<PluginConfig[]> = pipe(
        cog,
        switchMap((cog) =>
            pipe(
                concat([lazy(() => fromValue([] as Selection)), selection]),
                switchMap((selection) => makeAutoloadBuildingPlugins(cog, availablePlugins, selection)),
            ),
        ),
    ) satisfies Source<PluginConfig[]>;
    return { plugins };
}

/**
 * makeSelectedPlugins returns a source that converts the given plugins into PluginConfigs
 */
function makeSelectedPlugins(cog: CogServices, pluginIDs: string[]) {
    return pluginIDs.length > 0
        ? pipe(
              cog.query(GetSelectedPluginsDocument, { gameID: cog.gameID, pluginIDs }, { subscribe: false }),
              map(({ game }) => game.state.plugins),
              map((plugins) =>
                  plugins.map(
                      (p) =>
                          ({
                              id: p.id,
                              name: p.name ? p.name.value : 'unnamed',
                              src: p.src ? p.src.value : '',
                              hash: p.src ? p.src.hash : p.id,
                              trust: PluginTrust.UNTRUSTED,
                              type: pluginTypeForNodeKind(p.supports?.kind),
                              kindID: p.supports?.id || '<invalid>', // TODO: filter out invalid
                          } satisfies PluginConfig),
                  ),
              ),
          )
        : lazy(() => fromValue([] satisfies PluginConfig[]));
}

/**
 * makePluginSelector creates a source of plugin configs, which get populated
 * by setting the requested ids in the returned Selector function
 *
 */
export function makePluginSelector(cog: Source<CogServices>, defaultPlugins?: PluginConfig[]) {
    const { source: selectedPluginIDs, next: selectPlugins } = makeSubject<string[]>();
    const plugins = pipe(
        cog,
        switchMap((cog) =>
            pipe(
                concat([lazy(() => fromValue([] as string[])), selectedPluginIDs]),
                switchMap((pluginIDs) => makeSelectedPlugins(cog, pluginIDs)),
                map((plugins) => [...plugins, ...(defaultPlugins || [])] satisfies PluginConfig[]),
            ),
        ),
    ) satisfies Source<PluginConfig[]>;
    return { plugins, selectPlugins };
}

/**
 * loadPlugin converts a PluginConfig into an ActivePlugin by loading it's
 * source into a sandboxed js runtime ready to recv update commands.
 *
 * loaded "guest" source has only limited access to communicate with the host:
 *
 * they can load one specific module `import ds from 'downstream'` which gives
 * them access to the following API:
 *
 * ```ts
 *
 * ds.dispatch({name: 'ACTION_NAME', args: []}) // sends an action as the player
 *
 * ds.log('hello') // prints a message to the game log
 *
 * ```
 *
 * other than than that, a plugin source is expected the implement a function
 * that will be called to render state:
 *
 * ```ts
 *
 * export default function update(state) {
 *      return {version: 1, components: []};
 * }
 *
 * ```
 *
 */
export function loadPlugin(runtime: QuickJSRuntime, dispatch: DispatchFunc, logger: Logger, config: PluginConfig) {
    if (!config || !config.id) {
        throw new Error(`unabled to load plugin: no id provided`);
    }
    if (!config.src) {
        throw new Error(`unable to load plugin ${config.id}: no src`);
    }
    // create a flag that will be check to decide if
    // the api within the plugin is enabled or not.
    //
    // the api bindings are only usable when api.enabled = true
    //
    // during execution of an event handler this is the case,
    // but during background operation and during update calls
    // the api is disabled.
    //
    // this prevents a class of undesirable activities such as
    // plugins triggering dispatch calls on load or responding
    // to state changes in update
    const api = { enabled: false };

    // const qjs = await getQuickJS();
    // const runtime = qjs.newRuntime();
    runtime.setMemoryLimit(1024 * 640 * 10);
    runtime.setMaxStackSize(1024 * 320);
    // Interrupt computation after 1024 calls to the interrupt handler
    // let interruptCycles = 0;
    // runtime.setInterruptHandler(() => {
    //     console.log('int');
    //     return ++interruptCycles > 1024;
    // });
    const context = runtime.newContext();

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
                logger.log(...args);
            } catch (err) {
                console.error(`plugin-${config.id}: error while attempting to deliver log message: ${err}`);
            }
            return context.undefined;
        })
        .consume((fn: any) => context.setProp(dsHandle, 'log', fn));

    // attach the __ds proxy to global object
    context.setProp(context.global, '__ds', dsHandle);
    dsHandle.dispose();

    // console.log
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
                        res.json().then((json) => {
                            const bodyJSON = context.evalCode(`((json) => json)(${JSON.stringify(json)})`);
                            const bodyJSONHandle = context.unwrapResult(bodyJSON);
                            p.resolve(bodyJSONHandle);
                            bodyJSONHandle.dispose();
                        });
                        p.settled.then(context.runtime.executePendingJobs);
                        return p.handle;
                    })
                    .consume((handle) => context.setProp(resObj, 'json', handle));

                context
                    .newFunction('text', () => {
                        const p = context.newPromise();
                        res.text().then((txt) => {
                            p.resolve(context.newString(txt || ''));
                        });
                        p.settled.then(context.runtime.executePendingJobs);
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
        promise.settled.then(context.runtime.executePendingJobs);
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
            globalThis.__update = async (nextState, block) => {
                const res = await Promise.resolve(update(nextState, block));

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
        `,
    );
    context.unwrapResult(ok).consume(context.getString);

    // setup the submit func
    const submitProxy = async (ref: string, values: PluginSubmitCallValues): Promise<void> => {
        if (api.enabled) {
            console.error('plugin unable to handle event: already handling an event for this plugin');
            return;
        }
        console.log('submit', ref, values);
        try {
            api.enabled = true;
            // TODO: THIS MUST HAVE A TIMEOUT OR THE WHOLE THING WILL BE DEADLOCKED LOCKED!!!!
            const res = await context.evalCode(`(function({ref, values}){
                    const fn = globalThis.__refs[ref];
                    fn && fn(values);
                    return JSON.stringify({ok: true});
                })(${JSON.stringify({ ref, values })})`);
            context.unwrapResult(res).consume(context.getString);
        } finally {
            api.enabled = false;
        }
    };

    // setup the update func
    const updateProxy = async (state: GameState, block: number): Promise<PluginUpdateResponse> => {
        console.time(`updateProxy: ${config.name} ${config.id}`);
        console.time(`updateProxy-eval: ${config.name} ${config.id}`);
        const res = context.evalCode(`globalThis.__update(${JSON.stringify(state)}, ${block})`);
        const promiseHandle = context.unwrapResult(res);
        console.timeEnd(`updateProxy-eval: ${config.name} ${config.id}`);
        // Convert the promise handle into a native promise and await it.
        // If code like this deadlocks, make sure you are calling
        // runtime.executePendingJobs appropriately.
        console.time(`updateProxy-getp: ${config.name} ${config.id}`);
        const p = context.resolvePromise(promiseHandle);
        console.timeEnd(`updateProxy-getp: ${config.name} ${config.id}`);

        return p.then((resolvedResult) => {
            promiseHandle.dispose();
            const resolvedHandle = context.unwrapResult(resolvedResult);
            const pluginResponseJSON = context.getString(resolvedHandle);
            resolvedHandle.dispose();
            const pluginResponse = JSON.parse(pluginResponseJSON);
            console.timeEnd(`updateProxy: ${config.name} ${config.id}`);
            return {
                config,
                state: apiv1.normalizePluginState(pluginResponse, submitProxy),
            };
        });
    };

    // loaded
    return {
        ...config,
        update: updateProxy,
        context,
    };
}

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

export default {
    encodeCall,
    dispatch,
    log,
};
`;

export function pluginTypeForNodeKind(kind: string | undefined): PluginType {
    switch (kind) {
        case 'BuildingKind':
            return PluginType.BUILDING;
        case 'Item':
            return PluginType.ITEM;
        default:
            console.warn('unknown plugin type for node kind:', kind);
            return PluginType.CORE;
    }
}

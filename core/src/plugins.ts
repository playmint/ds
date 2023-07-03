import { ethers } from 'ethers';
import { getQuickJS, QuickJSRuntime } from 'quickjs-emscripten';
import { concat, fromPromise, fromValue, lazy, makeSubject, map, pipe, Source, switchMap, zip } from 'wonka';
import * as apiv1 from './api/v1';
import { actionArgFromUnknown } from './cog';
import {
    AvailablePluginFragment,
    GetAvailablePluginsDocument,
    GetSelectedPluginsDocument,
    SelectedTileFragment,
} from './gql/graphql';
import { Logger } from './logger';
import {
    ActivePlugin,
    CogAction,
    CogServices,
    DispatchFunc,
    GameState,
    PluginConfig,
    PluginState,
    PluginSubmitCallValues,
    PluginTrust,
    PluginType,
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
                query(GetAvailablePluginsDocument, { gameID }),
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
async function noopDispatcher(...actions: CogAction[]) {
    console.warn('dispatch failed: attempt to dispatch without a connected player', actions);
}

/**
 * makePluginUI sends the current State to each wanted plugin and returns a
 * stream of all the normalized plugin responses.
 */
export function makePluginUI(logger: Logger, plugins: Source<PluginConfig[]>, state: Source<GameState>) {
    const sandbox = makePluginSandbox();
    return pipe(
        zip<any>({ sandbox, plugins, state }),
        map<any, PluginState[]>(
            ({
                sandbox,
                state,
                plugins,
            }: {
                sandbox: { runtime: QuickJSRuntime; active: Map<string, ActivePlugin> };
                state: GameState;
                plugins: PluginConfig[];
            }) =>
                plugins
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
                            return plugin.update(state);
                        } catch (err) {
                            console.error(`plugin ${p.id}:`, err);
                            return { components: [], version: 1, error: `${err}` };
                        }
                    })
                    .filter((res): res is PluginState => !!res),
        ),
    );
}

function isAutoloadableBuildingPlugin(p: AvailablePluginFragment, tiles?: SelectedTileFragment[]) {
    if (!p.supports) {
        return false;
    }
    if (!p.supports.metadata) {
        // FIXME: use src annotation not metadata
        return false;
    }
    if (pluginTypeForNodeKind(p.supports.kind) !== PluginType.BUILDING) {
        return false;
    }
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
}

/**
 * makeAutoloadBuildingPlugins filters source of available plugin configs down to only those relevent to
 * currently selected tile.
 */
function makeAutoloadBuildingPlugins(
    cog: CogServices,
    availablePlugins: Source<AvailablePluginFragment[]>,
    selection: Selection,
) {
    return pipe(
        availablePlugins,
        map((plugins) => plugins.filter((p) => isAutoloadableBuildingPlugin(p, selection.tiles))),
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
 * they can load one specific module `import ds from 'dawnseekers'` which gives
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
export function loadPlugin(
    runtime: QuickJSRuntime,
    dispatch: DispatchFunc,
    logger: Logger,
    { id: pluginId, src, type: pluginType, ...otherPluginProps }: PluginConfig,
) {
    if (!pluginId) {
        throw new Error(`unabled to load plugin: no id provided`);
    }
    if (!src) {
        throw new Error(`unable to load plugin ${pluginId}: no src`);
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
    // runtime.setInterruptHandler(() => ++interruptCycles > 1024);
    const context = runtime.newContext();

    // create the global __ds object where we stick all
    // the bridging functions
    const dsHandle = context.newObject();

    // setup the dispatch binding
    context
        .newFunction('dispatch', (reqHandle) => {
            try {
                if (!api.enabled) {
                    console.warn(`plugin-${pluginId}: cannot dispatch outside of event handler`);
                    return context.undefined;
                }
                const actions = JSON.parse(context.getString(reqHandle));
                if (typeof actions === 'undefined' || !Array.isArray(actions)) {
                    console.warn(`plugin-${pluginId}: invalid dispatch call`, actions);
                    return context.undefined;
                }
                dispatch(...actions);
                return context.newString('ok'); // TODO: return queue id
            } catch (err) {
                console.error(`plugin-${pluginId}: failure attempting to dispatch: ${err}`);
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
                    console.warn(`plugin-${pluginId}: api disabled outside of event handlers`);
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
                console.error(`plugin-${pluginId}: failure attempting to encodeCall: ${err}`);
                return context.undefined;
            }
        })
        .consume((fn: any) => context.setProp(dsHandle, 'encodeCall', fn));

    // setup the log binding
    context
        .newFunction('log', (reqHandle) => {
            try {
                if (!api.enabled) {
                    console.warn(`plugin-${pluginId}: ds api is unavilable outside of event handlers`);
                    return context.undefined;
                }
                const args = JSON.parse(context.getString(reqHandle));
                logger.log(...args);
            } catch (err) {
                console.error(`plugin-${pluginId}: error while attempting to deliver log message: ${err}`);
            }
            return context.undefined;
        })
        .consume((fn: any) => context.setProp(dsHandle, 'log', fn));

    // attach the __ds proxy to global object
    context.setProp(context.global, '__ds', dsHandle);
    dsHandle.dispose();

    // setup the module loader for the magic imports
    runtime.setModuleLoader((moduleName) => {
        switch (moduleName) {
            case '__plugin__':
                return src;
            case 'dawnseekers':
                return DS_GUEST_FUNCTIONS;
            default:
                throw new Error('importing modules is only available for dawnseekers module');
        }
    });

    // load the untrusted src via the module loader
    const ok = context.evalCode(
        `
            import update from '__plugin__';
            globalThis.__update = update;
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
    const updateProxy = (state: GameState): PluginState => {
        console.debug(`[${pluginId} send]`, state);
        const res = context.evalCode(`(function(nextState){

                const res = globalThis.__update(nextState);

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

            })(${JSON.stringify(state)})`);
        const pluginResponse = JSON.parse(context.unwrapResult(res).consume(context.getString));
        console.debug(`[${pluginId} recv]`, pluginResponse);
        return apiv1.normalizePluginState(pluginResponse, submitProxy);
    };

    // loaded
    return {
        id: pluginId,
        type: pluginType,
        src,
        update: updateProxy,
        context,
        ...otherPluginProps,
    };
}

// wrapper functions loaded by the fake 'dawnseekers' module within the guest
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
        default:
            return PluginType.CORE;
    }
}

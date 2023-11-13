import * as Comlink from 'comlink';
import {
    concat,
    debounce,
    fromPromise,
    fromValue,
    lazy,
    map,
    mergeMap,
    pipe,
    share,
    Source,
    switchMap,
    tap,
    zip,
} from 'wonka';
import * as apiv1 from './api/v1';
import { AvailablePluginFragment, GetAvailablePluginsDocument, WorldStateFragment } from './gql/graphql';
import {
    ActivePlugin,
    CogAction,
    CogServices,
    DispatchFunc,
    GameState,
    PluginConfig,
    PluginDispatchFunc,
    PluginSubmitCallValues,
    PluginTrust,
    PluginType,
    PluginUpdateResponse,
    QueuedSequencerAction,
    Sandbox,
    Selection,
    World,
} from './types';
import { getBagsAtEquipee, getBuildingAtTile } from './utils';
import { Logger } from './logger';

const active = new Map<string, ActivePlugin>();

/**
 * makeAvailablePlugins polls for the list of deployed plugins every now and
 * then (60s).
 *
 * we don't fetch on every subscription notification because this list could be
 * large and is not important that it is right up to date.
 *
 */
export function makeAvailablePlugins(client: Source<CogServices>) {
    let prev: AvailablePluginFragment[] | undefined;

    const source = pipe(
        client,
        switchMap(({ query, gameID }) =>
            pipe(
                query(GetAvailablePluginsDocument, { gameID }, { poll: 60 * 1000 }),
                map(({ game }) => game.state.plugins),
            ),
        ),
        tap((next) => (prev = next)),
        share,
    );

    const plugins = lazy(() => (prev ? concat([fromValue(prev), source]) : source));
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
    plugins: Source<PluginConfig[]>,
    sandbox: Comlink.Remote<Sandbox>,
    logMessage: Logger,
    questMessage: Logger,
    state: Source<GameState>,
    block: Source<number>,
) {
    return pipe(
        zip<any>({ plugins, state, block }),
        debounce(() => 250),
        map<any, Promise<PluginUpdateResponse[]>>(
            async ({ state, plugins, block }: { state: GameState; plugins: PluginConfig[]; block: number }) => {
                await sandbox.setState(
                    {
                        player: state.player
                            ? {
                                  id: state.player.id,
                                  addr: state.player.addr,
                                  quests: state.player.quests,
                              }
                            : undefined,
                        world: {
                            ...(state.world || {}),
                            sessions: [],
                        },
                        selected: state.selected,
                    },
                    block,
                );
                return Promise.all(
                    plugins
                        .map(async (p) => {
                            try {
                                const { player } = state;
                                const dispatch = player ? player.dispatch : noopDispatcher;
                                if (!p.id) {
                                    console.warn(`plugin has no id, skipping`);
                                    return null;
                                }
                                const plugin = active.has(p.id)
                                    ? active.get(p.id)
                                    : await loadPlugin(
                                          sandbox,
                                          dispatch,
                                          logMessage,
                                          questMessage.with({ name: p.kindID }),
                                          p,
                                      );
                                if (!plugin) {
                                    console.warn(`failed to get or load plugin ${p.id}`);
                                    return null;
                                }
                                active.set(p.id, plugin);
                                return plugin.update();
                            } catch (err) {
                                console.error(`plugin ${p.id}:`, err);
                                return null;
                            }
                        })
                        .filter((res): res is Promise<PluginUpdateResponse> => !!res),
                );
            },
        ),
        mergeMap((pluginResponses) => fromPromise(pluginResponses)),
        map((pluginResponses) => pluginResponses.filter((res): res is PluginUpdateResponse => !!res)),
    );
}

function isAutoloadableBuildingPlugin(
    p: AvailablePluginFragment,
    { tiles, mobileUnit }: Selection,
    world: WorldStateFragment,
) {
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
            const selectedBuilding = getBuildingAtTile(world.buildings, selectedTile);
            if (!selectedBuilding) {
                return false;
            }
            return p.supports.id == selectedBuilding.kind?.id;
        case PluginType.ITEM:
            if (!mobileUnit) {
                return false;
            }
            const unitItemKindIds = getBagsAtEquipee(world.bags, mobileUnit).flatMap((bag) =>
                bag.slots.flatMap((slot) => slot.item.id),
            );
            return unitItemKindIds.some((id) => p.supports?.id === id);
        default:
            return false;
    }
}

/**
 * makeAutoloadPlugins returns a source of available plugin configs that are selected
 * based on the current selection state
 */
export function makeAutoloadPlugins(
    availablePlugins: Source<AvailablePluginFragment[]>,
    selection: Source<Selection>,
    world: Source<World>,
) {
    const plugins = pipe(
        availablePlugins,
        switchMap((availablePlugins) =>
            pipe(
                world,
                switchMap((world) => {
                    return pipe(
                        selection,
                        map((selection) =>
                            availablePlugins
                                .filter((p) => isAutoloadableBuildingPlugin(p, selection, world))
                                .map(
                                    (p) =>
                                        ({
                                            id: p.id,
                                            name: p.name ? p.name.value : 'unnamed',
                                            src: p.src ? p.src.value : '',
                                            trust: PluginTrust.UNTRUSTED,
                                            type: pluginTypeForNodeKind(p.supports?.kind),
                                            kindID: p.supports?.id || '<invalid>', // TODO: filter out invalid
                                        } satisfies PluginConfig),
                                ),
                        ),
                    );
                }),
            ),
        ),
    ) satisfies Source<PluginConfig[]>;

    return { plugins };
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
export async function loadPlugin(
    sandbox: Comlink.Remote<Sandbox>,
    dispatch: DispatchFunc,
    logMessage: Logger,
    questMessage: Logger,
    config: PluginConfig,
) {
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

    const pluginDispatch: PluginDispatchFunc = (...actions: CogAction[]) =>
        dispatch(...actions)
            .then(() => true)
            .catch(() => false);

    const context = await sandbox.newContext(
        Comlink.proxy(pluginDispatch),
        Comlink.proxy(logMessage),
        Comlink.proxy(questMessage),
        config,
    );

    // setup the submit func
    const submitProxy = async (ref: string, values: PluginSubmitCallValues): Promise<void> => {
        console.log('submit', ref, values);
        const res = await sandbox.evalCode(
            context,
            `(async function({ref, values}){
                    const fn = globalThis.__refs[ref];
                    fn && fn(values);
                    return JSON.stringify({ok: true});
                })(${JSON.stringify({ ref, values })})`,
        );
        console.log('submitted', ref, res);
    };

    // setup the update func
    const updateProxy = async (): Promise<PluginUpdateResponse> => {
        const pluginResponse = await sandbox.evalCode(
            context,
            `(async () => {
                return globalThis.__update();
            })()`,
        );

        try {
            return {
                config,
                state: apiv1.normalizePluginState(pluginResponse, submitProxy),
            };
        } catch (err) {
            console.error('plugin did not return an expected response object:', err);
            return {
                config,
                state: apiv1.normalizePluginState({}, submitProxy),
            };
        }
    };

    // loaded
    return {
        ...config,
        update: updateProxy,
        context,
    };
}

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

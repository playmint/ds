import * as Comlink from 'comlink';
import {
    Source,
    concat,
    concatMap,
    debounce,
    fromPromise,
    fromValue,
    lazy,
    map,
    pipe,
    share,
    switchMap,
    tap,
    zip,
} from 'wonka';
import * as apiv1 from './api/v1';
import { AvailablePluginFragment, GetAvailablePluginsDocument, GetPluginSrcDocument } from './gql/graphql';
import { Logger } from './logger';
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
} from './types';
import { getBagsAtEquipee, getBuildingAtTile } from './utils';
import { ZoneWithBags } from './world';

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

export function fetchPluginSrc(client: Source<CogServices>, gameID: string, pluginIDs: string[]) {
    return pipe(
        client,
        switchMap(({ query }) => query(GetPluginSrcDocument, { gameID, pluginIDs })),
        map((result) => result.game.state.plugins),
    );
}

/**
 * noopDispatcher throws away dispatch calls and just logs them. it is used
 * when a plugin attempts to call dispatch but there is no connected player to
 * dispatch for.
 */
async function noopDispatcher(..._actions: CogAction[]): Promise<QueuedSequencerAction> {
    throw new Error('dispatch failed: attempt to dispatch without a connected player');
}

const activeBySandbox = new WeakMap<Object, Map<string, ActivePlugin>>();

type PluginExecutor = () => Promise<(PluginUpdateResponse | null)[]>;

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
        map<any, PluginExecutor>(
            ({ state, plugins, block }: { state: GameState; plugins: PluginConfig[]; block: number }) =>
                async () => {
                    if (!activeBySandbox.has(sandbox)) {
                        const m = new Map<string, ActivePlugin>();
                        activeBySandbox.set(sandbox, m);
                    }
                    const active = activeBySandbox.get(sandbox)!;
                    try {
                        await sandbox.setState(
                            {
                                player: state.player
                                    ? {
                                          id: state.player.id,
                                          addr: state.player.addr,
                                          zone: state.player.zone,
                                          tokens: state.player.tokens,
                                      }
                                    : undefined,
                                world: {
                                    ...(state.zone || {}),
                                    sessions: [],
                                },
                                selected: state.selected,
                            },
                            block,
                        );
                    } catch (err: any) {
                        if (err?.message && err?.message == 'SANDBOX_OOM') {
                            const dummy: PluginUpdateResponse = {
                                config: {
                                    id: 'dummy',
                                    name: 'just-here-to-pass-the-oom-error',
                                    type: PluginType.CORE,
                                    trust: PluginTrust.UNTRUSTED,
                                    src: '',
                                    kindID: '',
                                },
                                state: {
                                    components: [],
                                    map: [],
                                },
                                error: 'SANDBOX_OOM',
                            };
                            return [dummy];
                        }
                        return [];
                    }
                    return Promise.all(
                        plugins.map(async (p): Promise<PluginUpdateResponse | null> => {
                            let plugin: ActivePlugin | null | undefined;
                            try {
                                const { player } = state;
                                const dispatch = player ? player.dispatch : noopDispatcher;
                                if (!p.id) {
                                    console.warn(`plugin has no id, skipping`);
                                    return null;
                                }
                                plugin = active.has(p.id)
                                    ? active.get(p.id)
                                    : isZonePlugin(p) ||
                                      state.zone.buildings.some((building) => building?.kind?.id === p.kindID) ||
                                      state.global.items.some((item) => item?.id === p.kindID)
                                    ? await loadPlugin(
                                          sandbox,
                                          dispatch,
                                          logMessage,
                                          questMessage.with({ name: p.kindID }),
                                          p,
                                      )
                                    : null;
                                if (!plugin) {
                                    return null;
                                }
                                active.set(p.id, plugin);
                                const res = await Promise.race([
                                    plugin.update().catch((err) => console.error(`plugin-error: ${p.id}:`, err)),
                                    sleep(1000).then(() => {}),
                                ]);
                                if (typeof res === 'undefined') {
                                    console.warn(`plugin-timeout: ${p.id} took longer than 1000ms`);
                                    return null;
                                }
                                return res;
                            } catch (err: any) {
                                if (err?.message && err?.message == 'SANDBOX_OOM') {
                                    return {
                                        config: p,
                                        state: {
                                            components: [],
                                            map: [],
                                        },
                                        error: 'SANDBOX_OOM',
                                    };
                                }
                                console.error(`Removing plugin ${p.id} from 'active' due to error`, err);
                                if (plugin) {
                                    await sandbox.deleteContext(plugin.context);
                                }
                                active.delete(p.id);
                                return null;
                            }
                        }),
                    );
                },
        ),
        concatMap((getPluginResponses) => fromPromise(getPluginResponses())),
        map((pluginResponses) => pluginResponses.filter((res): res is PluginUpdateResponse => !!res)),
        share,
    );
}

function isAutoloadableBuildingPlugin(
    p: AvailablePluginFragment,
    { tiles, mobileUnit }: Selection,
    zone: ZoneWithBags,
) {
    if (!p.supports) {
        return false;
    }
    if (!p.supports.metadata) {
        // FIXME: use src annotation not metadata
        return false;
    }
    // filter out zone plugins for other zones
    if (pluginTypeForNodeKind(p.supports?.kind) == PluginType.ZONE && p.supports?.id != zone.id) {
        return false;
    }
    if (p.alwaysActive?.value == 'true') {
        return true;
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
            const selectedBuilding = getBuildingAtTile(zone.buildings, selectedTile);
            if (!selectedBuilding) {
                return false;
            }
            return p.supports.id == selectedBuilding.kind?.id;
        case PluginType.ITEM:
            if (!mobileUnit) {
                return false;
            }
            const unitItemKindIds = getBagsAtEquipee(zone.bags, mobileUnit).flatMap((bag) =>
                bag.slots.filter((slot) => slot.balance > 0).flatMap((slot) => slot.item.id),
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
    zone: Source<ZoneWithBags>,
    client: Source<CogServices>,
) {
    const plugins = pipe(
        client,
        switchMap((clientDetails) => {
            const { gameID } = clientDetails;
            return pipe(
                availablePlugins,
                switchMap((availablePlugins) =>
                    pipe(
                        zone,
                        switchMap((zone) =>
                            pipe(
                                selection,
                                map((selection) =>
                                    availablePlugins.filter((p) => isAutoloadableBuildingPlugin(p, selection, zone)),
                                ),
                                switchMap((filteredPlugins) => {
                                    const pluginIDs = filteredPlugins.map((p) => p.id);
                                    return pipe(
                                        fetchPluginSrc(client, gameID, pluginIDs),
                                        map((srcs) =>
                                            filteredPlugins.map((plugin) => ({
                                                ...plugin,
                                                src: srcs.find((src) => src.id === plugin.id)?.src?.value || '',
                                                trust: PluginTrust.UNTRUSTED,
                                                type: pluginTypeForNodeKind(plugin.supports?.kind),
                                                kindID: plugin.supports?.id || '<invalid>',
                                            })),
                                        ),
                                    );
                                }),
                            ),
                        ),
                    ),
                ),
            );
        }),
    );

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
        const res = await sandbox.submit(context, { ref, values });
        console.log('submitted', ref, res);
    };

    // setup the update func
    const updateProxy = async (): Promise<PluginUpdateResponse> => {
        try {
            const pluginResponse = await sandbox.update(context);

            const _pluginResponse = (await sandbox.hasContext(context)) === true ? pluginResponse : {};
            return {
                config,
                state: apiv1.normalizePluginState(_pluginResponse, submitProxy),
            };
        } catch (err) {
            if (String(err).includes('SANDBOX_OOM') || String(err).includes('out of memory')) {
                throw new Error('SANDBOX_OOM');
            }
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
        case 'Zone':
            return PluginType.ZONE;
        default:
            console.warn('unknown plugin type for node kind:', kind);
            return PluginType.CORE;
    }
}

export function sleep(ms: number): Promise<null> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
export function isZonePlugin(p: PluginConfig) {
    if (p.type != PluginType.ZONE) {
        return false;
    }
    return true;
}

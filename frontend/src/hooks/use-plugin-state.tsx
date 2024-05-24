// @refresh reset
import {
    ActivePlugin,
    CogAction,
    ConnectedPlayer,
    GameConfig,
    GetPluginSrcDocument,
    GlobalState,
    Logger,
    PluginConfig,
    PluginDispatchFunc,
    PluginSubmitCallValues,
    PluginTrust,
    PluginType,
    PluginUpdateResponse,
    QueuedSequencerAction,
    Sandbox,
    Selection,
    ZoneWithBags,
    apiv1,
} from '@app/../../core/src';
import { AvailablePluginFragment } from '@downstream/core/src/gql/graphql';
import { getBagsAtEquipee, getBuildingAtTile } from '@downstream/core/src/utils';
import * as Comlink from 'comlink';
import { ReactNode, createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { map, pipe, take, toPromise } from 'wonka';
import { useSources } from './use-game-state';

// hack to force hot module reloading to give up
export { disableSessionRefresh } from './use-session';
export { disableFastRefresh } from './use-unity-map';

export interface PluginContextProviderProps {
    config?: Partial<GameConfig>;
    children?: ReactNode;
}

export type PluginContextStore = {
    ui: PluginUpdateResponse[];
    audioBuffers?: Float32Array[];
};

const activeBySandbox = new WeakMap<any, Map<string, ActivePlugin>>();

export const PluginContext = createContext({} as PluginContextStore);

export const usePluginState = () => useContext(PluginContext);

export const PluginResponseProvider = ({ config, children }: PluginContextProviderProps) => {
    const { client, zone, player, selection, global, logger, questMsgSender, availablePlugins } = useSources();
    const { tiles: selectedTiles, mobileUnit: selectedMobileUnit } = selection || {};
    const [pluginLoading, setPluginLoading] = useState<Map<string, boolean>>(new Map());
    const [plugins, setPlugins] = useState<PluginConfig[]>();
    const [ui, setUI] = useState<PluginUpdateResponse[]>([]);
    const [sandbox, setSandbox] = useState<Comlink.Remote<Sandbox>>();
    const [audioBuffers, setAudioBuffers] = useState<Float32Array[] | undefined>();
    const workerRef = useRef<Worker>();

    useEffect(() => {
        if (!config) {
            return;
        }
        workerRef.current = new Worker(new URL('../workers/snowsphere.ts', import.meta.url));
        const workerSandbox: Comlink.Remote<Sandbox> = Comlink.wrap(workerRef.current);
        workerSandbox
            .init(config)
            .then(() => {
                console.log('new sandbox started');
                setSandbox(() => workerSandbox);
            })
            .catch(() => console.error(`sandbox init fail`));
        return () => {
            if (workerRef.current) {
                workerRef.current.terminate();
            }
        };
    }, [config]);

    const selectedTile = useMemo(() => (selectedTiles || []).find(() => true), [selectedTiles]);

    const selectedBuildingKindId: string | undefined = useMemo(() => {
        if (!selectedTile) {
            return;
        }
        return getBuildingAtTile(zone?.buildings || [], selectedTile)?.kind?.id;
    }, [selectedTile, zone?.buildings]);

    const selectedUnitItemIds: string[] = useMemo(() => {
        if (!zone?.bags) {
            return [];
        }
        if (!selectedMobileUnit) {
            return [];
        }
        const mobileUnitBags = selectedMobileUnit ? getBagsAtEquipee(zone.bags, selectedMobileUnit) : [];
        return [
            ...new Set(
                mobileUnitBags
                    .flatMap((bag) => bag.slots.map((slot) => (slot.item && slot.balance > 0 ? slot.item.id : null)))
                    .filter((id): id is string => !!id)
            ),
        ].sort();
    }, [selectedMobileUnit, zone?.bags]);
    const zoneId = zone?.id;

    const availablePluginHash = (availablePlugins || [])
        .map((p) => p.id)
        .sort()
        .join(',');
    const selectedUnitItemHash = selectedUnitItemIds.join(',');
    const selectedPlugins: Map<string, AvailablePluginFragment> = useMemo(() => {
        const selectedPlugins = new Map<string, AvailablePluginFragment>();
        if (!availablePlugins) {
            return selectedPlugins;
        }
        if (!zoneId) {
            return selectedPlugins;
        }
        availablePlugins
            .filter((plugin) => isAutoloadablePlugin({ plugin, selectedBuildingKindId, selectedUnitItemIds, zoneId }))
            .forEach((p) => {
                selectedPlugins.set(p.id, p);
            });
        return selectedPlugins;
        // use hashes to avoid object issues, ignoring on purpose so be careful
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [availablePluginHash, selectedBuildingKindId, selectedUnitItemHash, zoneId]);

    // query for the plugin sources
    //
    const selectedPluginsHash = [...selectedPlugins.keys()].join(',');
    useEffect(() => {
        if (!client) {
            return;
        }
        const pluginIDs = [...selectedPlugins.keys()];
        pipe(
            client.query(GetPluginSrcDocument, { gameID: client.gameID, pluginIDs }),
            map((result) => result.game.state.plugins),
            take(1),
            toPromise
        )
            .then((pluginSources) => {
                const plugins = pluginSources
                    .map(({ id, src }) => {
                        const p = selectedPlugins.get(id);
                        if (!p) {
                            return null;
                        }
                        return {
                            id: p.id,
                            name: p.name ? p.name.value : 'unnamed',
                            src: src ? src.value : '',
                            trust: PluginTrust.UNTRUSTED,
                            type: pluginTypeForNodeKind(p.supports?.kind),
                            kindID: p.supports?.id || '<invalid>', // TODO: filter out invalid
                        };
                    })
                    .filter((p): p is PluginConfig => !!p);
                setPlugins(plugins);
            })
            .catch(() => {
                console.warn('failed to fetch plugin srcs', pluginIDs);
            });
        // use hashes to avoid object issues, ignoring on purpose so be careful
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [client, selectedPluginsHash]);

    // return a plugin dispatcher wrapped with some loading states
    const pluginDispatch: PluginDispatchFunc = useMemo(() => {
        const dispatch = player?.dispatchAndWait ? player.dispatchAndWait : noopDispatcher;
        return (id: string, ...actions: CogAction[]): Promise<boolean> => {
            setPluginLoading((pluginLoading) => {
                return new Map(pluginLoading.set(id, true));
            });
            return dispatch(...actions)
                .then(() => sleep(1000))
                .then(() => true)
                .catch(() => false)
                .finally(() => {
                    setPluginLoading((pluginLoading) => {
                        return new Map(pluginLoading.set(id, false));
                    });
                });
        };
    }, [player?.dispatchAndWait]);

    useEffect(() => {
        if (!sandbox) {
            return;
        }
        if (!player) {
            return;
        }
        if (!zone) {
            return;
        }
        if (!global) {
            return;
        }
        if (!plugins) {
            return;
        }
        if (!selection) {
            return;
        }
        if (!logger) {
            return;
        }
        if (!questMsgSender) {
            return;
        }
        getPluginStates({
            sandbox,
            player,
            zone,
            global,
            selection,
            plugins,
            logger,
            questMsgSender,
            dispatch: pluginDispatch,
            loading: pluginLoading,
        })
            .then((ui) => ui.filter((data): data is PluginUpdateResponse => !!data))
            .then((ui) => {
                const audioBuffers = ui.map((res) => res.state.audioBuffer).filter((ab): ab is Float32Array => !!ab);
                if (audioBuffers.length > 0) {
                    setAudioBuffers(audioBuffers);
                }
                return setUI(ui);
            })
            .catch((err) => console.error('failed to get plugin states', err));
    }, [sandbox, player, zone, global, plugins, selection, logger, questMsgSender, pluginDispatch, pluginLoading]);

    const pluginStates = {
        ui,
        audioBuffers,
    };

    return <PluginContext.Provider value={pluginStates}>{children}</PluginContext.Provider>;
};

async function getPluginStates({
    sandbox,
    player,
    dispatch,
    zone,
    global,
    selection,
    plugins,
    logger,
    questMsgSender,
    loading,
}: {
    sandbox: Comlink.Remote<Sandbox>;
    player: ConnectedPlayer;
    dispatch: PluginDispatchFunc;
    zone: ZoneWithBags;
    global: GlobalState;
    selection: Selection;
    plugins: PluginConfig[];
    logger: Logger;
    questMsgSender: Logger;
    loading: Map<string, boolean>;
}) {
    let a = activeBySandbox.get(sandbox);
    if (!a) {
        a = new Map<string, ActivePlugin>();
        activeBySandbox.set(sandbox, a);
    }
    const active = a;
    if (!active) {
        throw new Error('no active list');
    }
    try {
        await sandbox.setState(
            {
                player: player
                    ? {
                          id: player.id,
                          addr: player.addr,
                          zone: player.zone,
                          tokens: player.tokens,
                      }
                    : undefined,
                world: {
                    ...(zone || {}),
                },
                selected: selection || {},
            },
            global?.block || 0
        );
        return await Promise.all(
            plugins.map((config) =>
                getPluginState({
                    config,
                    sandbox,
                    active,
                    dispatch,
                    zone,
                    global,
                    logger,
                    questMsgSender,
                    loading: !!loading.get(config.id),
                })
            )
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
}

async function getPluginState({
    config,
    sandbox,
    active,
    dispatch,
    zone,
    global,
    logger,
    questMsgSender,
    loading,
}: {
    config: PluginConfig;
    sandbox: Comlink.Remote<Sandbox>;
    active: Map<string, ActivePlugin>;
    dispatch: PluginDispatchFunc;
    zone: ZoneWithBags;
    global: GlobalState;
    logger: Logger;
    questMsgSender: Logger;
    loading: boolean;
}): Promise<PluginUpdateResponse | null> {
    let plugin: ActivePlugin | null | undefined;
    try {
        if (!config.id) {
            console.warn(`plugin has no id, skipping`);
            return null;
        }
        plugin = active.has(config.id)
            ? active.get(config.id)
            : isZonePlugin(config) ||
              zone.buildings.some((building) => building?.kind?.id === config.kindID) ||
              global.items.some((item) => item?.id === config.kindID)
            ? await loadPlugin(sandbox, dispatch, logger, questMsgSender.with({ name: config.kindID }), config)
            : null;
        if (!plugin) {
            return null;
        }
        active.set(config.id, plugin);
        const res = await Promise.race([
            plugin.update().catch((err) => console.error(`plugin-error: ${config.id}:`, err)),
            sleep(1000).then(() => {}),
        ]);
        if (typeof res === 'undefined') {
            console.warn(`plugin-timeout: ${config.id} took longer than 1000ms`);
            return null;
        }
        res.loading = loading;
        return res;
    } catch (err: any) {
        if (err?.message && err?.message == 'SANDBOX_OOM') {
            return {
                config,
                state: {
                    components: [],
                    map: [],
                },
                error: 'SANDBOX_OOM',
            };
        }
        console.error(`Removing plugin ${config.id} from 'active' due to error`, err);
        if (plugin) {
            await sandbox.deleteContext(plugin.context);
        }
        active.delete(config.id);
        return null;
    }
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
    dispatch: PluginDispatchFunc,
    logger: Logger,
    questMsgSender: Logger,
    config: PluginConfig
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

    const context = await sandbox.newContext(
        Comlink.proxy(dispatch),
        Comlink.proxy(logger),
        Comlink.proxy(questMsgSender),
        config
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

export function sleep(ms: number): Promise<null> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAutoloadablePlugin({
    plugin,
    selectedBuildingKindId,
    selectedUnitItemIds,
    zoneId,
}: {
    plugin: AvailablePluginFragment;
    selectedBuildingKindId?: string;
    selectedUnitItemIds: string[];
    zoneId: string;
}) {
    if (!plugin.supports) {
        return false;
    }
    if (!plugin.supports.metadata) {
        // FIXME: use src annotation not metadata
        return false;
    }
    // filter out zone plugins for other zones
    if (pluginTypeForNodeKind(plugin.supports?.kind) == PluginType.ZONE && plugin.supports?.id != zoneId) {
        return false;
    }
    if (plugin.alwaysActive?.value == 'true') {
        return true;
    }
    switch (pluginTypeForNodeKind(plugin.supports.kind)) {
        case PluginType.BUILDING:
            if (!selectedBuildingKindId) {
                return false;
            }
            return plugin.supports.id == selectedBuildingKindId;
        case PluginType.ITEM:
            if (!selectedUnitItemIds) {
                return false;
            }
            return selectedUnitItemIds.some((id) => plugin.supports?.id === id);
        default:
            return false;
    }
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

export function isZonePlugin(p: PluginConfig) {
    if (p.type != PluginType.ZONE) {
        return false;
    }
    return true;
}

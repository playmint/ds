import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { mergeMap, pipe, scan, Source, subscribe } from 'wonka';
import { makeCogClient } from './cog';
import { BuildingKindFragment } from './gql/graphql';
import { makeAvailableBuildingKinds } from './kinds';
import { Logger, makeLogger } from './logger';
import { makeConnectedPlayer } from './player';
import { makeAutoloadPlugins, makeAvailablePlugins, makePluginUI } from './plugins';
import { makeSelection } from './selection';
import { makeGameState } from './state';
import {
    AvailableBuildingKind,
    AvailablePlugin,
    ConnectedPlayer,
    GameConfig,
    GameState,
    Log,
    PluginConfig,
    PluginUpdateResponse,
    Selection,
    Selector,
    Wallet,
    World,
} from './types';
import { makeWallet, WalletProvider } from './wallet';
import { makeWorld } from './world';

export interface DSContextProviderProps {
    config?: Partial<GameConfig>;
    defaultPlugins?: PluginConfig[]; // FIXME: this is temporary
    children?: ReactNode;
}

export interface SelectionSelectors {
    selectMobileUnit: Selector<string | undefined>;
    selectTiles: Selector<string[] | undefined>;
    selectIntent: Selector<string | undefined>;
    selectMapElement: Selector<string | undefined>;
}

export interface DSContextStore {
    wallet: Source<Wallet | undefined>;
    player: Source<ConnectedPlayer | undefined>;
    world: Source<World>;
    state: Source<GameState>;
    block: Source<number>;
    selection: Source<Selection>;
    selectors: SelectionSelectors;
    selectProvider: Selector<WalletProvider>;
    ui: Source<PluginUpdateResponse[]>;
    logger: Logger;
    logs: Source<Log>;
    buildingKinds: Source<AvailableBuildingKind[]>;
    availablePlugins: Source<AvailablePlugin[]>;
}

export const DSContext = createContext({} as DSContextStore);

export const useSources = () => useContext(DSContext);

export const DSProvider = ({ config, children }: DSContextProviderProps) => {
    const { sources, setConfig } = useMemo(() => {
        const { wallet, selectProvider } = makeWallet();
        const { client, setConfig } = makeCogClient();
        const { logger, logs } = makeLogger({ name: 'main' });
        const player = makeConnectedPlayer(client, wallet, logger);
        const world = makeWorld(client);
        const { selection, ...selectors } = makeSelection(client, world, player);

        const { plugins: availablePlugins } = makeAvailablePlugins(client);
        const { plugins: activePlugins } = makeAutoloadPlugins(client, availablePlugins, selection);

        const { kinds: buildingKinds } = makeAvailableBuildingKinds(client);

        const state = makeGameState(
            player,
            world,
            selection,
            selectors.selectTiles,
            selectors.selectMobileUnit,
            selectors.selectIntent,
            selectors.selectMapElement,
        );
        const block = pipe(
            client,
            mergeMap((client) => client.block),
        );
        const ui = makePluginUI(logger, activePlugins, state, block);

        return {
            sources: {
                block,
                wallet,
                player,
                world,
                selection,
                selectors,
                selectProvider,
                state,
                availablePlugins,
                buildingKinds,
                ui,
                logger,
                logs,
            },
            setConfig,
        };
    }, []);

    useEffect(() => {
        if (!setConfig) {
            return;
        }
        if (!config) {
            return;
        }
        setConfig(config);
    }, [config, setConfig]);

    return <DSContext.Provider value={sources}>{children}</DSContext.Provider>;
};

export function useBlock(): number | undefined {
    const sources = useSources();
    return useSource(sources.block);
}

// fetch the player and dispatcher for the currently connected wallet.
export function usePlayer(): ConnectedPlayer | undefined {
    const sources = useSources();
    return useSource(sources.player);
}

export function useWallet(): { wallet: Wallet | undefined; selectProvider: Selector<WalletProvider> } {
    const sources = useSources();
    const wallet = useSource(sources.wallet);
    const selectProvider = sources.selectProvider;
    return { selectProvider, wallet };
}

// fetch the current world state
// the world state is "a little bit of everything, but not in detail", enough
// to draw the map with some things on it, the selected items have more data as
// they are selected
export function useWorld(): World | undefined {
    const sources = useSources();
    return useSource(sources.world);
}

// fetch the current selection data + selector funcs
export function useSelection(): Selection & SelectionSelectors {
    const { selection, selectors } = useSources();
    const selected = useSource(selection) || {};
    return { ...selected, ...selectors };
}

// fetch the data that was rendered by the plugins
export function usePluginState(): PluginUpdateResponse[] | undefined {
    const sources = useSources();
    return useSource(sources.ui);
}

// fetch the list of building kind names/ids
export function useBuildingKinds(): BuildingKindFragment[] | undefined {
    const sources = useSources();
    return useSource(sources.buildingKinds);
}

// subscribe to the last n most recent logs
export function useLogs(limit: number): Log[] | undefined {
    const sources = useSources();
    const [value, setValue] = useState<Log[] | undefined>(undefined);

    useEffect(() => {
        const { unsubscribe } = pipe(
            sources.logs,
            scan((logs, log) => {
                logs.push(log);
                if (logs.length > limit) {
                    logs.shift();
                }
                return [...logs];
            }, [] as Log[]),
            subscribe(setValue),
        );
        return unsubscribe;
    }, [sources.logs, limit]);

    return value;
}

// helper to merged togther all the state things (same shape plugins use)
export function useGameState(): Partial<GameState> {
    const sources = useSources();
    const [state, setState] = useState<Partial<GameState>>({});

    useEffect(() => {
        const { unsubscribe } = pipe(sources.state, subscribe(setState));
        return unsubscribe;
    }, [sources.player, sources.world, sources.selection]);

    return state;
}

// helper to directly subscribe to a source
export function useSource<T>(source: Source<T>): T | undefined {
    const [value, setValue] = useState<T | undefined>();

    useEffect(() => {
        const { unsubscribe } = pipe(
            source,
            subscribe((v) => setValue(() => v)),
        );
        return unsubscribe;
    }, [source]);

    return value;
}

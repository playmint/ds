// @refresh reset
import {
    AvailableBuildingKind,
    AvailablePlugin,
    BuildingKindFragment,
    ConnectedPlayer,
    GameConfig,
    GameState,
    Log,
    Logger,
    makeAutoloadPlugins,
    makeAvailableBuildingKinds,
    makeAvailablePlugins,
    makeCogClient,
    makeConnectedPlayer,
    makeGameState,
    makeLogger,
    makePluginUI,
    makeSelection,
    makeWallet,
    makeWorld,
    PluginUpdateResponse,
    Selection,
    Selector,
    Wallet,
    WalletProvider,
    World,
} from '@app/../../core/src';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { mergeMap, pipe, scan, Source, subscribe } from 'wonka';
import { useWalletProvider } from './use-wallet-provider';

export interface DSContextProviderProps {
    config?: Partial<GameConfig>;
    children?: ReactNode;
}

export interface SelectionSelectors {
    selectMobileUnit: Selector<string | undefined>;
    selectTiles: Selector<string[] | undefined>;
    selectIntent: Selector<string | undefined>;
    selectMapElement: Selector<string | undefined>;
}

export interface DSContextValue {
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

export type DSContextStore = Partial<DSContextValue>;

export const DSContext = createContext({} as DSContextStore);

export const useSources = () => useContext(DSContext);

export const GameStateProvider = ({ config, children }: DSContextProviderProps) => {
    const { provider } = useWalletProvider();
    const [sources, setSources] = useState<DSContextStore>({});

    useEffect(() => {
        if (!config) {
            return;
        }
        const { wallet, selectProvider } = makeWallet();
        const { client } = makeCogClient(config);
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
            selectors.selectMapElement
        );
        const block = pipe(
            client,
            mergeMap((client) => client.block)
        );
        const ui = makePluginUI(logger, activePlugins, state, block);

        setSources({
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
        });
    }, [config]);

    const { selectProvider } = sources;

    useEffect(() => {
        if (!selectProvider) {
            return;
        }
        if (!provider) {
            return;
        }
        selectProvider(provider);
    }, [selectProvider, provider]);

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

export function useWallet(): { wallet: Wallet | undefined; selectProvider: Selector<WalletProvider> | undefined } {
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
export function useSelection(): Partial<Selection> & Partial<SelectionSelectors> {
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
        if (!sources.logs) {
            return;
        }
        const { unsubscribe } = pipe(
            sources.logs,
            scan((logs, log) => {
                logs.push(log);
                if (logs.length > limit) {
                    logs.shift();
                }
                return [...logs];
            }, [] as Log[]),
            subscribe(setValue)
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
        if (!sources.state) {
            return;
        }
        const { unsubscribe } = pipe(sources.state, subscribe(setState));
        return unsubscribe;
    }, [sources.state]);

    return state;
}

// helper to directly subscribe to a source
export function useSource<T>(source?: Source<T>): T | undefined {
    const [value, setValue] = useState<T | undefined>();

    useEffect(() => {
        if (!source) {
            return;
        }
        const { unsubscribe } = pipe(
            source,
            subscribe((v) => setValue(() => v))
        );
        return unsubscribe;
    }, [source]);

    return value;
}

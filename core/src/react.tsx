import React from 'react';
import { map, pipe, scan, Source, subscribe, zip } from 'wonka';
import { makeCogClient } from './cog';
import { BuildingKindFragment } from './gql/graphql';
import { makeAvailableBuildingKinds } from './kinds';
import { Logger, makeLogger } from './logger';
import { makeConnectedPlayer } from './player';
import { makeAutoloadPlugins, makeAvailablePlugins, makePluginSelector, makePluginUI } from './plugins';
import { makeSelection } from './selection';
import { makeGameState } from './state';
import {
    Wallet,
    AvailableBuildingKind,
    AvailablePlugin,
    ConnectedPlayer,
    GameConfig,
    Log,
    PluginConfig,
    PluginState,
    Selection,
    Selector,
    GameState,
    World,
} from './types';
import { makeWallet, WalletProvider } from './wallet';
import { makeWorld } from './world';

export interface DSContextProviderProps {
    initialConfig?: Partial<GameConfig>;
    defaultPlugins?: PluginConfig[]; // FIXME: this is temporary
    children?: React.ReactNode;
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
    selection: Source<Selection>;
    selectors: SelectionSelectors;
    selectProvider: Selector<WalletProvider>;
    ui: Source<PluginState[]>;
    logger: Logger;
    logs: Source<Log>;
    buildingKinds: Source<AvailableBuildingKind[]>;
    availablePlugins: Source<AvailablePlugin[]>;
    enabledPlugins: Source<PluginConfig[]>;
    selectPlugins: Selector<string[]>;
    setConfig: (cfg: Partial<GameConfig>) => void;
}

export const DSContext = React.createContext<DSContextStore>({} as DSContextStore);

export const useSources = () => React.useContext(DSContext);

export const DSProvider = ({ initialConfig, defaultPlugins, children }: DSContextProviderProps) => {
    const sources = React.useMemo((): DSContextStore => {
        const { wallet, selectProvider } = makeWallet();
        const { client, setConfig } = makeCogClient(initialConfig || {});
        const { logger, logs } = makeLogger({ name: 'main' });
        const player = makeConnectedPlayer(client, wallet, logger);
        const world = makeWorld(client);
        const { selection, ...selectors } = makeSelection(client, world, player);

        const { plugins: availablePlugins } = makeAvailablePlugins(client);
        const { plugins: enabledPlugins, selectPlugins } = makePluginSelector(client, defaultPlugins);
        const { plugins: autoloadPlugins } = makeAutoloadPlugins(client, availablePlugins, selection);

        const { kinds: buildingKinds } = makeAvailableBuildingKinds(client);

        const uiPlugins: Source<PluginConfig[]> = pipe(
            zip([enabledPlugins, autoloadPlugins]),
            map((plugins) => [...plugins[0], ...plugins[1]]),
        );
        const state = makeGameState(
            player,
            world,
            selection,
            selectors.selectTiles,
            selectors.selectMobileUnit,
            selectors.selectIntent,
            selectors.selectMapElement,
        );
        const ui = makePluginUI(logger, uiPlugins, state);

        return {
            wallet,
            player,
            world,
            selection,
            selectors,
            selectProvider,
            state,
            availablePlugins,
            enabledPlugins,
            buildingKinds,
            ui,
            logger,
            logs,
            setConfig,
            selectPlugins,
        };
    }, [initialConfig]);

    return <DSContext.Provider value={sources}>{children}</DSContext.Provider>;
};

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
export function usePluginState(): PluginState[] | undefined {
    const sources = useSources();
    return useSource(sources.ui);
}

// fetch the list of building kind names/ids
export function useBuildingKinds(): BuildingKindFragment[] | undefined {
    const sources = useSources();
    return useSource(sources.buildingKinds);
}

// fetch everything you need to list, and select plugins
export function usePlugins() {
    const { availablePlugins, enabledPlugins, selectPlugins } = useSources();
    const available = useSource(availablePlugins);
    const enabled = useSource(enabledPlugins);
    return { available, enabled, selectPlugins: selectPlugins };
}

// subscribe to the last n most recent logs
export function useLogs(limit: number): Log[] | undefined {
    const sources = useSources();
    const [value, setValue] = React.useState<Log[] | undefined>(undefined);

    React.useEffect(() => {
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
    const [state, setState] = React.useState<Partial<GameState>>({});

    React.useEffect(() => {
        const { unsubscribe } = pipe(sources.state, subscribe(setState));
        return unsubscribe;
    }, [sources.player, sources.world, sources.selection]);

    return state;
}

// helper to directly subscribe to a source
export function useSource<T>(source: Source<T>): T | undefined {
    const [value, setValue] = React.useState<T | undefined>();

    React.useEffect(() => {
        const { unsubscribe } = pipe(
            source,
            subscribe((v) => setValue(() => v)),
        );
        return unsubscribe;
    }, [source]);

    return value;
}

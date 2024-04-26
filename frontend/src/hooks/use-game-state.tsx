// @refresh reset
import {
    AvailablePlugin,
    CogServices,
    ConnectedPlayer,
    GameConfig,
    GlobalState,
    Log,
    Logger,
    makeAvailablePlugins,
    makeCogClient,
    makeConnectedPlayer,
    makeGlobal,
    makeLogger,
    makeWallet,
    makeZone,
    NodeSelectors,
    PluginUpdateResponse,
    Sandbox,
    SelectedMapElement,
    Selection,
    Selector,
    Wallet,
    WalletProvider,
    WorldTileFragment,
    ZoneWithBags,
} from '@app/../../core/src';
import * as Comlink from 'comlink';
import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { pipe, scan, Source, subscribe } from 'wonka';
import { useWalletProvider } from './use-wallet-provider';

// hack to force hot module reloading to give up
export { disableSessionRefresh } from './use-session';
export { disableFastRefresh } from './use-unity-map';

export interface DSContextProviderProps {
    config?: Partial<GameConfig>;
    zoneId?: string;
    children?: ReactNode;
}

export interface SelectionSelectors {
    selectMobileUnit: Selector<string | undefined>;
    selectTiles: Selector<string[] | undefined>;
    selectIntent: Selector<string | undefined>;
    selectMapElement: Selector<SelectedMapElement | undefined>;
}

export type DSContextValue = {
    zone: ZoneWithBags;
    global: GlobalState;
    wallet: Source<Wallet | undefined>;
    player: ConnectedPlayer;
    selection: Selection;
    selectors: SelectionSelectors;
    selectProvider: Selector<WalletProvider>;
    logger: Logger;
    logs: Source<Log>;
    availablePlugins: AvailablePlugin[];
    client: CogServices;
    ui: Source<PluginUpdateResponse[]>;
    questMsgSender: Logger;
    questMsgs: Source<Log>;
};

export type DSContextStore = Partial<DSContextValue>;

export const DSContext = createContext({} as DSContextStore);

export const useSources = () => useContext(DSContext);

export const GameStateProvider = ({ config, zoneId, children }: DSContextProviderProps) => {
    const { provider } = useWalletProvider();
    const [sources, setSources] = useState<DSContextStore>();
    const [zone, setZone] = useState<ZoneWithBags>();
    const [global, setGlobal] = useState<GlobalState>();
    const [player, setPlayer] = useState<ConnectedPlayer>();
    const [client, setClient] = useState<CogServices>();
    const [availablePlugins, setAvailablePlugins] = useState<AvailablePlugin[]>();
    const [selectedMobileUnitID, selectMobileUnit] = useState<string>();
    const [selectedIntent, selectIntent] = useState<string>();
    const [selectedTileIDs, selectTiles] = useState<string[]>();
    const [selectedMapElement, selectMapElement] = useState<SelectedMapElement>();
    // const [sandboxDeaths, setSandboxDeaths] = useState<number>(0);
    const workerRef = useRef<Worker>();

    useEffect(() => {
        if (!config) {
            return;
        }
        const { wallet, selectProvider } = makeWallet();
        const { client } = makeCogClient(config);
        const { logger, logs } = makeLogger({ name: 'main' });

        const zoneKey = zoneId ? Number(BigInt.asIntN(16, BigInt(zoneId.replace(NodeSelectors.Zone, '0x')))) : 0;
        const player = makeConnectedPlayer(client, wallet, logger, zoneKey);
        const global = makeGlobal(client);
        const zone = makeZone(client, zoneId || '');

        const availablePlugins = makeAvailablePlugins(client);
        const { logger: questMsgSender, logs: questMsgs } = makeLogger({ name: 'questMessages' });

        workerRef.current = new Worker(new URL('../workers/snowsphere.ts', import.meta.url));
        const workerSandbox: Comlink.Remote<Sandbox> = Comlink.wrap(workerRef.current);
        workerSandbox
            .init(config)
            .then(() => console.log('new sandbox started'))
            .catch(() => console.error(`sandbox init fail`));

        setSources({
            wallet,
            selectProvider,
            logger,
            logs,
            questMsgSender,
            questMsgs,
        });

        const clientData = pipe(
            client,
            subscribe((v) => setClient(() => v))
        );

        const zoneData = pipe(
            zone,
            subscribe((v) => setZone(() => v))
        );

        const globalData = pipe(
            global,
            subscribe((v) => setGlobal(() => v))
        );

        const playerData = pipe(
            player,
            subscribe((v) => setPlayer(() => v))
        );

        const availablePluginsData = pipe(
            availablePlugins,
            subscribe((v) => setAvailablePlugins(() => v))
        );

        return () => {
            console.log('REMAKING SUBSCRIPTIONS');
            zoneData.unsubscribe();
            globalData.unsubscribe();
            playerData.unsubscribe();
            availablePluginsData.unsubscribe();
            clientData.unsubscribe();
        };
    }, [config, zoneId]);

    const selectedMobileUnit = useMemo(() => {
        const mobileUnit = player && zone ? zone.mobileUnits?.find((s) => s.id === selectedMobileUnitID) : undefined;
        return mobileUnit;
    }, [selectedMobileUnitID, player, zone]);

    const selectedTiles = useMemo(() => {
        if (!zone) {
            return [];
        }
        if (!selectedTileIDs) {
            return [];
        }
        return selectedTileIDs
            .map((id) => zone.tiles.find((t) => t.id === id))
            .filter((t): t is WorldTileFragment => !!t);
    }, [selectedTileIDs, zone]);

    const selection: Partial<Selection> = useMemo(
        () => ({
            mobileUnit: selectedMobileUnit,
            tiles: selectedTiles,
            intent: selectedIntent,
            mapElement: selectedMapElement,
        }),
        [selectedMobileUnit, selectedTiles, selectedIntent, selectedMapElement]
    );
    const selectors: SelectionSelectors = useMemo(
        () => ({
            selectMobileUnit,
            selectTiles,
            selectIntent,
            selectMapElement,
        }),
        []
    );

    const { selectProvider } = sources || {};

    useEffect(() => {
        if (!selectProvider) {
            return;
        }
        if (!provider) {
            return;
        }
        selectProvider(provider);
    }, [selectProvider, provider]);

    const value = useMemo(() => {
        return {
            zone,
            global,
            player,
            selection,
            selectors,
            availablePlugins,
            ...(sources || {}),
        };
    }, [sources, zone, global, player, availablePlugins, selection, selectors]);

    return <DSContext.Provider value={value}>{children}</DSContext.Provider>;
};

export function useCogClient(): CogServices | undefined {
    const sources = useSources();
    return useSource(sources.client);
}

// fetch the player and dispatcher for the currently connected wallet.
export function usePlayer(): ConnectedPlayer | undefined {
    const { player } = useSources();
    return player;
}

export function useWallet(): { wallet: Wallet | undefined; selectProvider: Selector<WalletProvider> | undefined } {
    const sources = useSources();
    const wallet = useSource(sources.wallet);
    const selectProvider = sources.selectProvider;
    return { selectProvider, wallet };
}

// fetch the current zone state
export function useZone(): ZoneWithBags | undefined {
    const { zone } = useSources();
    return zone;
}

// fetch the shared global state (building kinds, etc)
export function useGlobal(): GlobalState | undefined {
    const { global } = useSources();
    return global;
}

// fetch the current selection data + selector funcs
export function useSelection(): Partial<Selection> & Partial<SelectionSelectors> {
    const { selection, selectors } = useSources();
    return { ...selection, ...selectors };
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

// subscribe to the last n most recent quest messages
export function useQuestMessages(limit: number): Log[] | undefined {
    const sources = useSources();
    const [value, setValue] = useState<Log[] | undefined>(undefined);

    useEffect(() => {
        if (!sources.questMsgs) {
            return;
        }
        const { unsubscribe } = pipe(
            sources.questMsgs,
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
    }, [sources.questMsgs, limit]);

    return value;
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

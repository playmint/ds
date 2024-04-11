// @refresh reset
import {
    AvailablePlugin,
    CogServices,
    ConnectedPlayer,
    GameConfig,
    GameState,
    GlobalState,
    Log,
    Logger,
    makeAutoloadPlugins,
    makeAvailablePlugins,
    makeCogClient,
    makeConnectedPlayer,
    makeGameState,
    makeGlobal,
    makeLogger,
    makePluginUI,
    makeSelection,
    makeWallet,
    makeZone,
    PluginUpdateResponse,
    Sandbox,
    SelectedMapElement,
    Selection,
    Selector,
    Wallet,
    WalletProvider,
    ZoneWithBags,
} from '@app/../../core/src';
import * as Comlink from 'comlink';
import { createContext, ReactNode, useMemo, useContext, useEffect, useRef, useState } from 'react';
import { mergeMap, pipe, scan, Source, subscribe } from 'wonka';
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

export interface DSContextValue1 {
    wallet: Source<Wallet | undefined>;
    player: Source<ConnectedPlayer | undefined>;
    zone: Source<ZoneWithBags>;
    global: Source<GlobalState>;
    state: Source<GameState>;
    block: Source<number>;
    selection: Source<Selection>;
    selectors: SelectionSelectors;
    selectProvider: Selector<WalletProvider>;
    logger: Logger;
    logs: Source<Log>;
    availablePlugins: Source<AvailablePlugin[]>;
    client: Source<CogServices>;
}

export interface DSContextValue2 {
    ui: Source<PluginUpdateResponse[]>;
    questMsgSender: Logger;
    questMsgs: Source<Log>;
}

export type DSContextValue = DSContextValue1 & DSContextValue2;

export type DSContextStore = Partial<DSContextValue>;

export const DSContext = createContext({} as DSContextStore);

export const useSources = () => useContext(DSContext);

export const GameStateProvider = ({ config, zoneId, children }: DSContextProviderProps) => {
    const { provider } = useWalletProvider();
    const [sources1, setSources1] = useState<DSContextValue1>();
    const [sources2, setSources2] = useState<DSContextValue2>();
    // const [sandboxDeaths, setSandboxDeaths] = useState<number>(0);
    const workerRef = useRef<Worker>();

    useEffect(() => {
        if (!config) {
            return;
        }
        const { wallet, selectProvider } = makeWallet();
        const { client } = makeCogClient(config);
        const { logger, logs } = makeLogger({ name: 'main' });
        const player = makeConnectedPlayer(client, wallet, logger);
        const global = makeGlobal(client);
        const zone = makeZone(client, zoneId || '');
        const { selection, ...selectors } = makeSelection(client, zone, player);

        const { plugins: availablePlugins } = makeAvailablePlugins(client);

        const state = makeGameState(
            player,
            zone,
            global,
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

        setSources1({
            client,
            block,
            wallet,
            player,
            global,
            zone,
            selection,
            selectors,
            selectProvider,
            state,
            availablePlugins,
            logger,
            logs,
        });
    }, [config, zoneId]);

    useEffect(() => {
        if (workerRef.current) {
            workerRef.current?.terminate();
        }
        if (!sources1) {
            return;
        }
        const { availablePlugins, selection, zone, global, logger, state, block } = sources1;
        if (!availablePlugins) {
            return;
        }
        if (!selection) {
            return;
        }
        if (!zone) {
            return;
        }
        if (!global) {
            return;
        }
        if (!logger) {
            return;
        }
        if (!state) {
            return;
        }
        if (!block) {
            return;
        }
        if (!config) {
            return;
        }
        workerRef.current = new Worker(new URL('../workers/snowsphere.ts', import.meta.url));
        const workerSandbox: Comlink.Remote<Sandbox> = Comlink.wrap(workerRef.current);
        workerSandbox
            .init(config)
            .then(() => {
                console.log('new sandbox started');
                const { logger: questMsgSender, logs: questMsgs } = makeLogger({ name: 'questMessages' });
                const { plugins: activePlugins } = makeAutoloadPlugins(availablePlugins, selection, zone);
                const ui = makePluginUI(activePlugins, workerSandbox, logger, questMsgSender, state, block);

                // re-enable if using sandbox instead of snowsphere
                // pipe(
                //     ui,
                //     subscribe((responses) => {
                //         if (responses.some((res) => res.error === 'SANDBOX_OOM')) {
                //             console.error('sandbox OOM detected, restarting?');
                //             setSandboxDeaths((prev) => prev + 1);
                //         }
                //     })
                // );
                setSources2({
                    ...sources1,
                    ui,
                    questMsgSender,
                    questMsgs,
                });
            })
            .catch(() => console.error(`sandbox init fail`));
    }, [sources1, config]);

    const { selectProvider } = sources1 || {};

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
            ...(sources1 || {}),
            ...(sources2 || {}),
        };
    }, [sources1, sources2]);

    return <DSContext.Provider value={value || {}}>{children}</DSContext.Provider>;
};

export function useCogClient(): CogServices | undefined {
    const sources = useSources();
    return useSource(sources.client);
}

export function useBlock(): number | undefined {
    const sources = useSources();
    return useSource(sources.block);
}

// fetch the player and dispatcher for the currently connected wallet.
export function usePlayer(): ConnectedPlayer | undefined {
    const sources = useSources();
    return useSource(sources.player);
}

// This should become a function to call the reloading of the plugins
export function usePluginReload(): number | undefined {
    const sources = useSources();
    return useSource(sources.block);
}

export function useWallet(): { wallet: Wallet | undefined; selectProvider: Selector<WalletProvider> | undefined } {
    const sources = useSources();
    const wallet = useSource(sources.wallet);
    const selectProvider = sources.selectProvider;
    return { selectProvider, wallet };
}

// fetch the current zone state
export function useZone(): ZoneWithBags | undefined {
    const sources = useSources();
    return useSource(sources.zone);
}

// fetch the shared global state (building kinds, etc)
export function useGlobal(): GlobalState | undefined {
    const sources = useSources();
    return useSource(sources.global);
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

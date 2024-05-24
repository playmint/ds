import { Eip1193Provider, ethers } from 'ethers';
import { Source } from 'wonka';
import { ActionsInterface } from './abi/Actions';
import { configureClient } from './cog';
import {
    AvailablePluginFragment,
    BuildingKindFragment,
    GetSelectedPlayerQuery,
    GetZoneQuery,
    GetGlobalQuery,
    OnEventSubscription,
    SelectedPlayerFragment,
    WorldMobileUnitFragment,
    WorldPlayerFragment,
    WorldTileFragment,
    AssignedQuestFragment,
} from './gql/graphql';
import { Logger } from './logger';
import { GlobalState, ZoneWithBags } from './world';

export interface EthereumProvider extends Eip1193Provider {
    isMetaMask?: boolean;
    on(eventName: string | symbol, listener: (...args: any[]) => void): this;
    off(eventName: string | symbol, listener: (...args: any[]) => void): this;
}

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<T>;

export interface Sandbox {
    init: (cfg: Partial<GameConfig>) => Promise<void>;
    newContext: (
        dispatch: PluginDispatchFunc,
        logMessage: Logger,
        questMessage: Logger,
        config: PluginConfig,
    ) => Promise<number>;
    deleteContext: (id: number) => Promise<void>;
    hasContext: (id: number) => Promise<boolean>;
    update: (context: number) => Promise<PluginUpdateResponse>;
    submit: (context: number, values: { ref: string; values: any }) => Promise<void>;
    setState: (state: GameStatePlugin, blk: number) => Promise<void>;
}

export enum LogLevel {
    DEBUG,
    LOG,
    INFO,
    WARN,
    ERROR,
    FATAL,
}

export type LogValue = string | number;
export type LogValues = {
    [key: string]: LogValue;
};

export type LogSender = (o: Log) => void;

export interface Log {
    name: string;
    timestamp: Date;
    level: LogLevel;
    text: string;
    values: LogValues;
}

export interface LoggerConfig {
    level?: LogLevel;
    name: string;
    values?: LogValues;
    sender?: LogSender;
}

export enum BiomeKind {
    UNDISCOVERED = 0,
    DISCOVERED = 1,
}

export enum FacingDirectionKind {
    RIGHT = 0,
    LEFT = 1,
}

export interface GameConfig {
    gameID: string;
    authMessage: (addr: string, ttl: number) => string;
    actions: ethers.Interface;
    wsEndpoint: string;
    wsSocketImpl?: unknown;
    httpEndpoint: string;
    httpFetchImpl?: typeof fetch;
    tonkEndpoint?: string;
    networkEndpoint: string;
    networkID: string;
    networkName: string;
}

export type ActionName = Parameters<ActionsInterface['getFunction']>[0];
export interface CogAction {
    name: ActionName;
    args: any[];
}

export type AnyGameVariables = {
    gameID: string;
    [prop: string]: any;
};

export type AnyVariables = {
    [prop: string]: any;
};

export type PromisifiedSource<T = any> = Source<T> & {
    toPromise: () => Promise<T>;
};

export type CogIndexer = {
    gameID: string;
    query: ReturnType<typeof configureClient>['query'];
};

export type CogRouter = {
    gameID: string;
    signin: ReturnType<typeof configureClient>['signin'];
    signout: ReturnType<typeof configureClient>['signout'];
};

export type CogDispatcher = {
    gameID: string;
    dispatch: ReturnType<typeof configureClient>['dispatch'];
};

export type CogServices = CogDispatcher & CogRouter & CogIndexer;

export interface CogQueryConfig {
    // subscribe indicates that this query should be re-run when new data is
    // available
    subscribe?: boolean;
    // if set to a number (of milliseconds), uses polling for subscription
    // instead of events from the graphql subscription
    poll?: number;
}

export enum CogEvent {
    STATE_CHANGED,
}

export interface CogSession {
    expires: number; // timestamp
    key: ethers.Wallet;
    owner: ethers.Signer;
    dispatch: Awaited<ReturnType<ReturnType<typeof configureClient>['signin']>>['dispatch'];
    dispatchAndWait: Awaited<ReturnType<ReturnType<typeof configureClient>['signin']>>['dispatchAndWait'];
    signout: Awaited<ReturnType<ReturnType<typeof configureClient>['signin']>>['signout'];
}

export enum DispatchedActionsStatus {
    QUEUED_CLIENT = 'pending-client',
    QUEUED_SEQUENCER = 'pending-sequencer',
    QUEUED_CHAIN = 'pending-chain',
    COMMITTED = 'committed',
    REJECTED_CLIENT = 'rejected-client',
    REJECTED_SEQUENCER = 'rejected-sequencer',
    REJECTED_CHAIN = 'rejected-chain',
}

export interface QueuedClientAction {
    status: DispatchedActionsStatus.QUEUED_CLIENT;
    actions: CogAction[];
    optimistic: boolean;
    clientQueueId: string;
    resolve: (action: QueuedSequencerAction) => void;
    reject: (err: Error) => void;
}

export interface QueuedSequencerAction {
    status: DispatchedActionsStatus.QUEUED_SEQUENCER;
    actions: CogAction[];
    clientQueueId: string;
}

export interface QueuedChainAction {
    status: DispatchedActionsStatus.QUEUED_CHAIN;
    actions: CogAction[];
    clientQueueId: string;
}

export interface RejectedClientAction {
    status: DispatchedActionsStatus.REJECTED_CLIENT;
    actions: CogAction[];
    clientQueueId: string;
    error: string;
}

export interface RejectedSequencerAction {
    status: DispatchedActionsStatus.REJECTED_SEQUENCER;
    actions: CogAction[];
    clientQueueId: string;
    error: string;
}

export interface RejectedChainAction {
    status: DispatchedActionsStatus.REJECTED_CHAIN;
    actions: CogAction[];
    clientQueueId: string;
    txId: string;
    error: string;
}

export interface CommitedAction {
    status: DispatchedActionsStatus.COMMITTED;
    actions: CogAction[];
    clientQueueId: string;
    txId: string;
}

export type DispatchedAction =
    | QueuedClientAction
    | QueuedSequencerAction
    | QueuedChainAction
    | RejectedClientAction
    | RejectedSequencerAction
    | RejectedChainAction
    | CommitedAction;

export interface Wallet {
    id: string; // player id
    address: string;
    signer: () => Promise<ethers.Signer>;
    session?: CogSession;
    method: string;
}

export type AnyGameQuery = GetSelectedPlayerQuery | GetZoneQuery | GetGlobalQuery;
export type AnyGameSubscription = OnEventSubscription;

export enum PluginTrust {
    UNTRUSTED,
    TRUSTED,
}

export enum PluginType {
    CORE,
    BUILDING,
    ITEM,
    ZONE,
}

export interface PluginConfig {
    id: string;
    name: string;
    type: PluginType;
    trust: PluginTrust;
    src: string;
    kindID: string;
}

export interface InactivePlugin {
    id: string;
    name: string;
    src: string;
    type: PluginType;
    trust: PluginTrust;
}

export interface ActivePlugin extends InactivePlugin {
    context: number;
    update: () => Promise<PluginUpdateResponse>;
}

export type PluginActionCallProxy = () => Promise<void>;
export type PluginSubmitCallValues = { [key: string]: string };
export type PluginSubmitCallProxy = (values: PluginSubmitCallValues) => Promise<void>;

export type PluginStateButtonAction = {
    text: string;
    type: 'action';
    disabled?: boolean;
    action: PluginActionCallProxy;
};

export type PluginStateButtonToggle = {
    text: string;
    type: 'toggle';
    disabled?: boolean;
    content: string;
};

export type PluginStateButtonSubmit = {
    text: string;
    type: 'submit';
    disabled?: boolean;
};

export type PluginStateButton = PluginStateButtonAction | PluginStateButtonToggle | PluginStateButtonSubmit;

export interface PluginStateComponentContent {
    id: string;
    submit?: PluginSubmitCallProxy;
    html?: string;
    buttons?: PluginStateButton[];
}

export const PluginStateComponentTypes = ['building', 'item'];
export type PluginStateComponentType = (typeof PluginStateComponentTypes)[number];

export function isComponentType(maybeType: unknown): maybeType is PluginStateComponentType {
    return typeof maybeType === 'string' && PluginStateComponentTypes.includes(maybeType as PluginStateComponentType);
}

export interface PluginStateComponent {
    id: string;
    type: PluginStateComponentType;
    title?: string;
    summary?: string;
    content?: PluginStateComponentContent[];
}

export interface PluginMapProperty {
    type: 'building' | 'tile' | 'unit';
    id: string;
    key: string;
    value: string | number;
}

export interface PluginState {
    components: PluginStateComponent[];
    map: PluginMapProperty[];
    audioBuffer?: Float32Array;
}

export interface PluginUpdateResponse {
    config: PluginConfig;
    state: PluginState;
    error?: string;
    loading?: boolean;
}

export type PluginSubmitProxy = (ref: string, values: PluginSubmitCallValues) => Promise<void>;

export type DispatchFunc = (...actions: CogAction[]) => Promise<QueuedSequencerAction>;

export type PluginDispatchFunc = (id: string, ...actions: CogAction[]) => Promise<boolean>;

export type AvailablePlugin = AvailablePluginFragment;
export type AvailableBuildingKind = BuildingKindFragment;

export interface PluginSelection {
    available: AvailablePlugin[];
    enabled: PluginConfig[];
}

export interface Selection {
    mobileUnit?: WorldMobileUnitFragment;
    tiles?: WorldTileFragment[];
    intent?: string;
    mapElement?: SelectedMapElement;
}

export type Selector<T> = (v: T) => void;

// shortcuts useful when you don't know if you have to full data or not
export type Player = WorldPlayerFragment & Partial<SelectedPlayerFragment>;
export type MobileUnit = WorldMobileUnitFragment & Partial<WorldMobileUnitFragment>;
export type Tile = WorldTileFragment & Partial<WorldTileFragment>;

// try to stay compat with existing plugins that expect "world"
export interface GameStatePluginWorld extends ZoneWithBags {}

export interface GameStatePlugin {
    player?: SelectedPlayerFragment;
    world: GameStatePluginWorld;
    selected: Selection;
}

export interface GameState {
    player?: ConnectedPlayer;
    zone: ZoneWithBags;
    global: GlobalState;
    selected: Selection;
    selectTiles: Selector<string[] | undefined>;
    selectMobileUnit: Selector<string | undefined>;
    selectIntent: Selector<string | undefined>;
    selectMapElement: Selector<SelectedMapElement | undefined>;
}

export interface ConnectedPlayer extends SelectedPlayerFragment {
    dispatch: DispatchFunc;
    dispatchAndWait: DispatchFunc;
    dispatched: Source<DispatchedAction>;
    active: () => boolean;
    login: () => Promise<CogSession | undefined>;
    load: (key: ethers.Wallet, expires: number) => Promise<CogSession | undefined>;
}

export type UnconnectedPlayer = undefined;

export type SelectedMapElement = { id: string; type: string };

export type QuestTaskEdge = AssignedQuestFragment['node']['tasks'][0];

export const QUEST_STATUS_ACCEPTED = 1;
export const QUEST_STATUS_COMPLETED = 2;

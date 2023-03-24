import { ethers } from 'ethers';
import { QuickJSContext } from 'quickjs-emscripten';
import { Source } from 'wonka';
import { configureClient } from './cog';
import {
    AvailablePluginFragment,
    BuildingKindFragment,
    GetSelectedPlayerQuery,
    GetWorldQuery,
    OnEventSubscription,
    SelectedPlayerFragment,
    SelectedSeekerFragment,
    SelectedTileFragment,
    WorldPlayerFragment,
    WorldSeekerFragment,
    WorldStateFragment,
    WorldTileFragment,
} from './gql/graphql';

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<T>;

export enum LogLevel {
    DEBUG,
    LOG,
    INFO,
    WARN,
    ERROR,
}

export type LogValue = string | number;
export type LogValues = {
    [key: string]: LogValue;
};

export type LogSender = (o: Log) => void;

export interface Log {
    name: string;
    level: LogLevel;
    text: string;
    values: LogValues;
}

export interface LoggerConfig {
    name: string;
    values?: LogValues;
    sender?: LogSender;
}

export enum BiomeKind {
    UNDISCOVERED = 0,
    DISCOVERED = 1,
}

export interface GameConfig {
    gameID: string;
    authMessage: (addr: string, ttl: number) => string;
    actions: ethers.Interface;
    wsEndpoint: string;
    wsSocketImpl?: unknown;
    httpEndpoint: string;
    httpFetchImpl?: typeof fetch;
}

export interface CogAction {
    name: string;
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
    subscription: ReturnType<typeof configureClient>['subscription'];
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

export interface CogSession {
    key: ethers.HDNodeWallet;
    owner: ethers.Signer;
    dispatch: Awaited<ReturnType<ReturnType<typeof configureClient>['signin']>>['dispatch'];
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
    clientQueueId: string;
}

export interface QueuedSequencerAction {
    status: DispatchedActionsStatus.QUEUED_SEQUENCER;
    actions: CogAction[];
    clientQueueId: string;
    seqQueueId: string;
}

export interface QueuedChainAction {
    status: DispatchedActionsStatus.QUEUED_CHAIN;
    actions: CogAction[];
    clientQueueId: string;
    seqQueueId: string;
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
    seqQueueId: string;
    error: string;
}

export interface RejectedChainAction {
    status: DispatchedActionsStatus.REJECTED_CHAIN;
    actions: CogAction[];
    clientQueueId: string;
    seqQueueId: string;
    txId: string;
    error: string;
}

export interface CommitedAction {
    status: DispatchedActionsStatus.COMMITTED;
    actions: CogAction[];
    clientQueueId: string;
    seqQueueId: string;
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
}

export type AnyGameQuery = GetSelectedPlayerQuery | GetWorldQuery;
export type AnyGameSubscription = OnEventSubscription;

export enum PluginTrust {
    UNTRUSTED,
    TRUSTED,
}

export enum PluginType {
    CORE,
    BUILDING,
}

export interface PluginConfig {
    id: string;
    name: string;
    type: PluginType;
    trust: PluginTrust;
    src: string;
    nodeID?: string;
}

export interface InactivePlugin {
    id: string;
    src: string;
    type: PluginType;
    trust: PluginTrust;
}

export interface ActivePlugin extends InactivePlugin {
    context: QuickJSContext;
    update: (state: State) => PluginState;
}

export type PluginActionCallProxy = () => Promise<void>;
export type PluginSubmitCallValues = { [key: string]: string };
export type PluginSubmitCallProxy = (values: PluginSubmitCallValues) => Promise<void>;

export type PluginStateButtonAction = {
    text: string;
    type: 'action';
    action: PluginActionCallProxy;
};

export type PluginStateButtonToggle = {
    text: string;
    type: 'toggle';
    content: string;
};

export type PluginStateButtonSubmit = {
    text: string;
    type: 'submit';
};

export type PluginStateButton = PluginStateButtonAction | PluginStateButtonToggle | PluginStateButtonSubmit;

export const PluginStateComponentContentTypes = ['popout', 'dialog', 'inline'] as const;
export type PluginStateComponentContentType = (typeof PluginStateComponentContentTypes)[number];

export function isComponentContentType(maybeType: unknown): maybeType is PluginStateComponentContentType {
    return (
        typeof maybeType === 'string' &&
        PluginStateComponentContentTypes.includes(maybeType as PluginStateComponentContentType)
    );
}

export interface PluginStateComponentContent {
    id: string;
    type: PluginStateComponentContentType;
    submit?: PluginSubmitCallProxy;
    html?: string;
    buttons?: PluginStateButton[];
}

export const PluginStateComponentTypes = ['building', 'tile', 'seeker', 'nav'];
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

export interface PluginState {
    components: PluginStateComponent[];
}

export type PluginSubmitProxy = (ref: string, values: PluginSubmitCallValues) => Promise<void>;

export type DispatchFunc = (...actions: CogAction[]) => void;

export type AvailablePlugin = AvailablePluginFragment;
export type AvailableBuildingKind = BuildingKindFragment;

export interface PluginSelection {
    available: AvailablePlugin[];
    enabled: PluginConfig[];
}

export interface Selection {
    seeker?: SelectedSeekerFragment;
    tiles?: SelectedTileFragment[];
    intent?: string;
}

export type Selector<T> = (v: T) => void;

export type World = WorldStateFragment;

// shortcuts useful when you don't know if you have to full data or not
export type Player = WorldPlayerFragment & Partial<SelectedPlayerFragment>;
export type Seeker = WorldSeekerFragment & Partial<SelectedSeekerFragment>;
export type Tile = WorldTileFragment & Partial<SelectedTileFragment>;

export interface State {
    player?: Player;
    world: World;
    selected: Selection;
}

export interface ConnectedPlayer extends SelectedPlayerFragment {
    dispatch: DispatchFunc;
    dispatched: Source<DispatchedAction>;
    pending: Source<DispatchedAction>;
    disconnect: () => void;
}

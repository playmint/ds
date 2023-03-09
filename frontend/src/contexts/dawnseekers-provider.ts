/** @format */
import { v4 as uuidv4 } from 'uuid';
import { ApolloClient, ObservableQuery, NormalizedCacheObject, InMemoryCache, split, HttpLink } from '@apollo/client';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { Observable, Observer, Subscription } from 'zen-observable-ts';
import {
    GetStateDocument,
    GetStateQuery,
    GetStateQueryVariables,
    SigninDocument,
    DispatchDocument,
    DispatchMutation
} from '@app/types//queries';
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const abi = ethers.AbiCoder.defaultAbiCoder();

const ACTIONS = new ethers.Interface([
    'function MOVE_SEEKER(uint32 sid, int16 q, int16 r, int16 s)',
    'function SCOUT_SEEKER(uint32 sid, int16 q, int16 r, int16 s)',
    'function DEV_SPAWN_SEEKER(address player, uint32 seekerID, int16 q, int16 r, int16 s)',
    'function DEV_SPAWN_TILE(uint8 kind, int16 q, int16 r, int16 s)'
]);

const gameID = 'DAWNSEEKERS';

export type NodeID = string;

export interface Node {
    id: NodeID;
}

export interface Edge {
    key: number;
}

export interface RawSelectionState {
    playerAddr?: string;
    seekerID?: NodeID;
    tileIDs: NodeID[];
}

export interface SelectionState {
    player?: Player;
    seeker?: Seeker;
    tiles?: Tile[];
}

export interface PluginStateButton {
    text: string;
    template: string; // TODO
}

export interface PluginStateTemplate {
    name: string;
    content: string;
}

export interface PluginStateSection {
    name: 'building' | 'tile' | 'seeker' | 'nav';
    title?: string;
    summary?: string;
    buttons?: PluginStateButton[];
    content?: string;
    templates?: PluginStateTemplate[];
}

export interface PluginState {
    sections?: PluginStateSection[];
}

export interface Session {
    owner: string;
    key: ethers.HDNodeWallet;
}

interface PluginPublishState extends PluginState {
    id: string; // plugin id
}

export interface UIState {
    selection: SelectionState;
    plugins: PluginPublishState[];
}

export interface Player extends Node {
    id: NodeID;
    addr: string;
    seekers: Seeker[];
}

export interface Resource extends Node {
    id: NodeID;
}

enum LocationKind {
    UNKNOWN,
    NEXT,
    PREV
}

export interface Location {
    kind: LocationKind;
    validFrom: number; // time
    tile: Tile;
}

export interface Seeker extends Node {
    id: NodeID;
    key: bigint;
    name: string;
    owner: Player;
    bags: EquipSlot[];
    location: {
        next: Location;
        prev: Location;
    };
}

export interface BuildingKind extends Node {
    id: NodeID;
    addr: string;
}

export interface Building extends Node {
    id: NodeID;
    kind: BuildingKind;
}

export interface ItemSlot extends Edge {
    balance: number;
    item: Node;
}

export interface EquipSlot extends Edge {
    bag: Node;
}

export interface Bag extends Node {
    id: NodeID;
    slots: ItemSlot[];
}

export interface TileCoords {
    q: number;
    r: number;
    s: number;
}

export enum BiomeKind {
    UNDISCOVERED = 0,
    DISCOVERED = 1
}

export interface Tile extends Node {
    id: NodeID;
    building?: Building;
    coords: TileCoords;
    bags: EquipSlot[];
    biome: BiomeKind;
}

export interface GameState {
    players: Player[];
    seekers: Seeker[];
    tiles: Tile[];
}

export interface State {
    ui: UIState;
    game: GameState;
}

export enum PluginTrust {
    UNTRUSTED,
    TRUSTED
}

export enum PluginType {
    CORE,
    BUILDING
}

export interface Plugin {
    id: string;
    type: PluginType;
    trust: PluginTrust;
    addr: string;
    channel: MessageChannel;
    worker: Worker;
    state: PluginState;
    resolvers: Map<string, Resolver>;
}

export interface PluginConfig {
    type: PluginType;
    trust: PluginTrust;
    addr: string;
    src: string;
}

export interface Resolver {
    resolve: (v: any) => void;
    reject: (v: any) => void;
}

export interface DawnseekersConfig {
    wsEndpoint: string;
    httpEndpoint: string;
    autoloadablePlugins?: PluginConfig[];
    corePlugins?: PluginConfig[];
}

const getSelector = (name: string): string => {
    const selector = new ethers.Interface([`function ${name}()`]).getFunction(name)?.selector;
    if (!selector) {
        throw new Error(`failed to generate selector for ${name}`);
    }
    return selector;
};

const NodeSelectors = {
    Tile: getSelector('Tile'),
    Seeker: getSelector('Seeker')
};

const CompoundKeyEncoder = {
    encodeInt16(nodeSelector: string, ...keys: [number, number, number, number]) {
        return ethers.concat([
            ethers.getBytes(nodeSelector),
            ethers.getBytes(ethers.toBeHex(BigInt(0), 12)),
            ethers.getBytes(ethers.toBeHex(ethers.toTwos(BigInt(keys[0]), 16), 2)),
            ethers.getBytes(ethers.toBeHex(ethers.toTwos(BigInt(keys[1]), 16), 2)),
            ethers.getBytes(ethers.toBeHex(ethers.toTwos(BigInt(keys[2]), 16), 2)),
            ethers.getBytes(ethers.toBeHex(ethers.toTwos(BigInt(keys[3]), 16), 2))
        ]);
    },
    encodeUint160(nodeSelector: string, ...keys: [ethers.BigNumberish]) {
        return ethers.concat([ethers.getBytes(nodeSelector), ethers.getBytes(ethers.toBeHex(BigInt(keys[0]), 20))]);
    }
};

export class DawnseekersClient {
    plugins: Plugin[];
    autoloadablePlugins: PluginConfig[];
    selection: RawSelectionState;
    game: GameState;
    latestState: State;
    cog: ApolloClient<NormalizedCacheObject>;
    observers: Observer<State>[];
    stateQuery: ObservableQuery<GetStateQuery, GetStateQueryVariables>;
    session?: Session;

    constructor({ httpEndpoint, wsEndpoint, autoloadablePlugins, corePlugins }: DawnseekersConfig) {
        this.plugins = [];
        this.selection = { tileIDs: [] };
        this.game = { seekers: [], tiles: [], players: [] };
        this.autoloadablePlugins = autoloadablePlugins || [];
        this.observers = [];
        this.latestState = { game: this.game, ui: { selection: {}, plugins: [] } };

        // init core plugins
        if (corePlugins) {
            corePlugins.forEach((plug) => console.warn('loading core plugins not implemented', plug));
        }

        // setup graphql client for comms with cog-services
        const httpLink = new HttpLink({
            uri: httpEndpoint
        });
        const wsLink = new GraphQLWsLink(
            createClient({
                url: wsEndpoint
            })
        );
        const link = split(
            ({ query }) => {
                const definition = getMainDefinition(query);
                return definition.kind === 'OperationDefinition' && definition.operation === 'subscription';
            },
            wsLink,
            httpLink
        );
        this.cog = new ApolloClient({
            link,
            uri: httpEndpoint,
            cache: new InMemoryCache()
        });

        // query for the game state every N seconds
        this.stateQuery = this.cog.watchQuery({
            query: GetStateDocument,
            variables: {},
            pollInterval: 1000,
            fetchPolicy: 'network-only'
        });
        this.stateQuery.subscribe({
            next: (result) => this.onStateQueryData(result.data),
            error: (err) => this.onStateQueryError(err)
        });

        // watch metamask account changes
        const ethereum = (window as any).ethereum;
        ethereum.request({ method: 'eth_accounts' }).then((accounts: string[]) => this.selectPlayer(accounts[0]));
    }

    private onStateQueryError(err: Error) {
        // TODO: ship this to all observers
        console.error('graphql', err);
    }

    private onStateQueryData(data: GetStateQuery) {
        // transform the raw query result into the nicely typed GameState shape
        const seekers: { [key: string]: Seeker } = {};
        const tiles: { [key: string]: Tile } = {};
        const bags: { [key: string]: Bag } = {};
        const resources: { [key: string]: Resource } = {};
        const players: { [key: string]: Player } = {};

        const getUnscoutedTile = (q: number, r: number, s: number): Tile | null => {
            const t = Object.values(tiles).find(({ coords: t }) => t.q === q && t.r === r && t.s === s);
            if (t) {
                return null;
            }
            return {
                id: CompoundKeyEncoder.encodeInt16(NodeSelectors.Tile, 0, q, r, s), //
                coords: { q, r, s },
                bags: [],
                biome: BiomeKind.UNDISCOVERED
            };
        };

        const getUnscoutedNeighbours = ({ coords: t }: Tile) => {
            return [
                getUnscoutedTile(t.q + 1, t.r, t.s - 1),
                getUnscoutedTile(t.q + 1, t.r - 1, t.s),
                getUnscoutedTile(t.q, t.r - 1, t.s + 1),
                getUnscoutedTile(t.q - 1, t.r, t.s + 1),
                getUnscoutedTile(t.q - 1, t.r + 1, t.s),
                getUnscoutedTile(t.q, t.r + 1, t.s - 1)
            ].filter((t): t is Tile => !!t);
        };

        data.game.state.players.forEach((p) => {
            players[p.id] = {
                id: p.id,
                addr: p.addr,
                seekers: [] // come back for this later
            };
        });
        data.game.state.resources.forEach((r) => {
            resources[r.id] = {
                id: r.id
            };
        });
        data.game.state.bags.forEach((b) => {
            bags[b.id] = {
                id: b.id,
                slots: b.slots.map((s) => ({
                    key: s.key,
                    balance: s.balance,
                    item: resources[s.resource.id] // FIXME: not just resources
                }))
            };
        });
        data.game.state.tiles.forEach((t) => {
            tiles[t.id] = {
                id: t.id,
                coords: {
                    q: Number(ethers.fromTwos(t.coords[1], 16)),
                    r: Number(ethers.fromTwos(t.coords[2], 16)),
                    s: Number(ethers.fromTwos(t.coords[3], 16))
                },
                biome: t.biome === 1 ? BiomeKind.DISCOVERED : BiomeKind.UNDISCOVERED,
                bags: t.bags
                    .map((b) => ({
                        key: b.key,
                        bag: bags[b.bag.id]
                    }))
                    .sort(byEdgeKey)
            };
        });
        // add in all the unscouted tiles around the edges
        // we do this because these are valid tiles for selection
        // even though they have no on-chain data yet
        Object.values(tiles).forEach((t) => {
            getUnscoutedNeighbours(t).forEach((unscoutedTile) => {
                tiles[unscoutedTile.id] = unscoutedTile;
            });
        });

        data.game.state.seekers.forEach((s) => {
            if (!s.owner) {
                console.warn('ignoring ownerless seeker', s);
                return;
            }
            const locations = s.location
                .map((l) => {
                    const tile = tiles[l.tile.id];
                    if (!tile) {
                        return null;
                    }
                    return {
                        kind: l.key === 0 ? LocationKind.PREV : l.key === 1 ? LocationKind.NEXT : LocationKind.UNKNOWN,
                        validFrom: l.time,
                        tile: tile
                    };
                })
                .filter((l): l is Location => !!l);
            const next = locations.find((loc) => loc.kind == LocationKind.NEXT);
            if (!next) {
                console.warn('invalid seeker data: missing NEXT location', s.id);
                return;
            }
            const prev = locations.find((loc) => loc.kind == LocationKind.PREV);
            if (!prev) {
                console.warn('invalid seeker data: missing PREV location', s.id);
                return;
            }
            seekers[s.id] = {
                id: s.id,
                key: ethers.getBigInt(s.seekerID),
                name: s.id,
                owner: players[s.owner.id],
                location: {
                    next,
                    prev
                },
                bags: s.bags
                    .map((b) => ({
                        key: b.key,
                        bag: bags[b.bag.id]
                    }))
                    .sort(byEdgeKey)
            };
        });
        // put the seekers on the players
        Object.values(players).forEach((p) => {
            p.seekers = Object.values(seekers)
                .filter((s) => s.owner.id == p.id)
                .sort(byNodeID);
        });
        this.game = {
            seekers: Object.values(seekers).sort(byNodeID),
            tiles: Object.values(tiles).sort(byNodeID),
            players: Object.values(players).sort(byNodeID)
        };
        // keep the seeker selection data insync
        if (this.selection.seekerID) {
            const selectedSeeker = seekers[this.selection.seekerID];
            if (!selectedSeeker) {
                console.warn('selected seeker no longer found in state, removing selection', this.selection.seekerID);
                this.selection.seekerID = undefined;
            } else {
                this.selection.seekerID = selectedSeeker.id;
            }
        }
        // keep the tiles selection data insync
        if (this.selection.tileIDs) {
            const selectedTiles = this.selection.tileIDs
                .map((selectedTileID) => tiles[selectedTileID])
                .filter((t): t is Tile => !!t);
            if (selectedTiles.length != this.selection.tileIDs.length) {
                console.warn('one or more selected tiles were not found in the state, removing selection');
                this.selection.tileIDs = [];
            } else {
                this.selection.tileIDs = selectedTiles.map((t) => t.id);
            }
        }
        // tell the world about it
        this.publish();
    }

    subscribe(observer: Observer<State>): Subscription {
        const observable = new Observable<State>((stateObserver) => {
            this.observers.push(stateObserver);
            stateObserver.next(this.latestState); // push last known state immediately
            return () => {
                this.observers = this.observers.filter((obs) => obs !== stateObserver);
            };
        });
        return observable.subscribe(observer);
    }

    private _unload(pluginID: string) {
        const plugin = this.plugins.find((p) => p.id == pluginID);
        if (!plugin) {
            return;
        }
        plugin.worker.terminate();
        this.plugins = this.plugins.filter((p) => p.id != pluginID);
    }

    async unload(pluginID: string) {
        this._unload(pluginID);
        return this.publish();
    }

    private async _load({ src, type, trust, addr }: PluginConfig) {
        // wrap src the api for talking over the channel
        const workerSrc = `
            let port;
            const ds = {
                dispatch(...args) {
                    return postMessagePromise('dispatch', args)
                        .catch(() => console.error('dispatch from worker fail and nothing caught it'));
                },
                select() {

                }
            };
            ${src};
            const plugin = new Plugin(ds);
            const resolvers = new Map();
            onmessage = function(e){
                if (e.data === 'INIT_CHANNEL') {
                    port = e.ports[0];
                    port.postMessage({type: 'ready', req: true, nonce: Math.random().toString()});
                    return;
                }
                if (!e.data.type) {
                    return;
                }
                const {type, nonce, args} = e.data;
                if (e.data.res) {
                    const resolver = resolvers.get(nonce);
                    if (!resolver) {
                        console.warn('worker received res but did not know the nonce');
                        return;
                    }
                    resolvers.delete(e.data.nonce);
                    if (e.data.error) {
                        resolver.reject(e.data.error);
                    }
                    resolver.resolve(e.data);
                    return;
                }
                if (type == 'render') {
                    const data = {
                        tileActionButton: plugin.renderTileActionButtons ? plugin.renderTileActionButtons(...args) : null,
                        tileActionDetails: plugin.renderTileActionDetails ? plugin.renderTileActionDetails(...args) : null,
                        showTileActionDetails: plugin.showTileActionDetails ? plugin.showTileActionDetails(...args) : null,
                    };
                    port.postMessage({type, nonce, res:true, data, error: null});
                } else if (type == 'onState' && plugin.onState) {
                    const data = plugin.onState(...args);
                    port.postMessage({type, nonce, res:true, data, error: null});
                } else if (type == 'onClick' && plugin.onClick) {
                    const data = plugin.onClick(...args);
                    port.postMessage({type, nonce, res:true, data, error: null});
                } else if (type == 'onSubmit' && plugin.onSubmit) {
                    const data = plugin.onSubmit(...args);
                    port.postMessage({type, nonce, res:true, data, error: null});
                } else {
                    port.postMessage({type, nonce, res:true, data, error: 'unhandlable message type: '+type});
                    console.error('unhandled message', e.data);
                }
            }

            function postMessagePromise(type, args) {
                return new Promise((resolve, reject) => {
                    const nonce = Math.random().toString();
                    resolvers.set(nonce, { resolve, reject });
                    port.postMessage({ type, nonce, args, req: true });
                });
            }

        `;
        // generate a unique id for the plugin
        // TODO: id should probably be hash of src
        const id = uuidv4();
        // start src in a worker
        const workerBlob = new Blob([workerSrc], { type: 'text/javascript' });
        const workerBlobUrl = URL.createObjectURL(workerBlob);
        const worker = new Worker(workerBlobUrl);
        // create a message channel and pass to plugin
        const channel = new MessageChannel();
        worker.postMessage('INIT_CHANNEL', [channel.port1]);
        // assemble the plugin object
        const plugin: Plugin = {
            id,
            type: type,
            addr: addr, // addr of contract, only makes sense for building plugins
            trust: trust,
            channel,
            worker,
            state: {},
            resolvers: new Map<string, Resolver>()
        };
        // setup the api that workers can use
        // wrapped in promise to block return until plugin says it is ready
        await new Promise((pluginIsReady) => {
            channel.port2.onmessage = (e) => {
                if (!e.data.nonce) {
                    console.error('invalid message from worker (missing nonce)', plugin.id, e);
                    return;
                }
                if (e.data.req) {
                    if (e.data.type == 'dispatch') {
                        const action = e.data?.args[0];
                        if (!action) {
                            console.error('invalid dispatch recved from plugin: missing action', plugin.id, e);
                        }
                        this.pluginDispatch(plugin.id, action, ...e.data.args.slice(1))
                            .then((data) => {
                                worker.postMessage({
                                    type: e.data.type,
                                    nonce: e.data.nonce,
                                    res: true,
                                    data,
                                    error: null
                                });
                            })
                            .catch((error) => {
                                worker.postMessage({
                                    type: e.data.type,
                                    nonce: e.data.nonce,
                                    res: true,
                                    data: null,
                                    error
                                });
                            });
                        return;
                    } else if (e.data.type == 'ready') {
                        pluginIsReady(true);
                        return;
                    }
                    console.error('unknown request from worker', plugin.id, e);
                    return;
                } else if (e.data.res) {
                    const resolver = plugin.resolvers.get(e.data.nonce);
                    if (!resolver) {
                        return;
                    }
                    plugin.resolvers.delete(e.data.nonce);
                    if (e.data.error) {
                        resolver.reject(e.data.error);
                    }
                    resolver.resolve(e.data);
                    return;
                } else {
                    console.error('invalid message from worker (missing req/res)', plugin.id, e);
                    return;
                }
            };
        });
        // keep track of the worker/plugin
        this.plugins.push(plugin);
    }

    async load(plug: PluginConfig) {
        await this._load(plug);
        return this.publish();
    }

    async autoloadBuildingPlugins() {
        const selectedTiles = this.getSelectedTiles();
        const markedForRemoval: string[] = [];
        const selectedBuilding = (() => {
            if (!selectedTiles) {
                return undefined;
            }
            if (selectedTiles.length !== 1) {
                return undefined;
            }
            return selectedTiles[0].building;
        })();
        if (selectedBuilding) {
            const { kind } = selectedBuilding;
            // unload all building plugins not of correct kind
            this.plugins.forEach((plugin) => {
                if (plugin.type !== PluginType.BUILDING) {
                    return; // leave non-building plugins alone
                }
                if (plugin.addr !== kind.addr) {
                    markedForRemoval.push(plugin.id);
                }
            });
            // load any missing building plugins
            for (let i = 0; i < this.autoloadablePlugins.length; i++) {
                const plug = this.autoloadablePlugins[i];
                if (plug.type !== PluginType.BUILDING) {
                    continue;
                }
                if (plug.addr !== kind.addr) {
                    continue;
                }
                await this._load(plug);
            }
        } else {
            // mark all building plugins for removal
            this.plugins.forEach((plugin) => {
                if (plugin.type !== PluginType.BUILDING) {
                    return; // leave non-building plugins alone
                }
                markedForRemoval.push(plugin.id);
            });
        }
        // terminate and remove marked
        markedForRemoval.forEach((id) => {
            this.unload(id);
        });
    }

    async dispatch(actionName: string, ...actionArgs: any): Promise<DispatchMutation['dispatch']> {
        console.log('dispatching:', actionName, actionArgs);
        const action = ACTIONS.encodeFunctionData(actionName, actionArgs);
        const res = await this._dispatchEncodedActions([action]);
        // force an update
        await this.stateQuery.refetch();
        return res;
    }

    private async _dispatchEncodedActions(actions: string[]): Promise<DispatchMutation['dispatch']> {
        const session = await this.getSession();
        const actionDigest = ethers.getBytes(
            ethers.keccak256(abi.encode(['bytes[]'], [actions.map((action) => ethers.getBytes(action))]))
        );
        const auth = await session.key.signMessage(actionDigest);
        return this.cog
            .mutate({ mutation: DispatchDocument, variables: { gameID, auth, actions } })
            .then((res) => res.data.dispatch)
            .catch((err) => console.error(err));
    }

    async getPlayerSigner(): Promise<ethers.Signer> {
        const ethereum = (window as any).ethereum;
        if (ethereum) {
            // Connect to the MetaMask EIP-1193 object. This is a standard
            // protocol that allows Ethers access to make all read-only
            // requests through MetaMask.
            const provider = new ethers.BrowserProvider(ethereum);
            return provider.getSigner();
        }
        throw new Error(`metamask not installed and we havent implemented WalletConnect yet sorry`);
    }

    async getSession(): Promise<Session> {
        if (!this.session) {
            this.session = await this._getSessionSigner();
        }
        return this.session;
    }

    private async _getSessionSigner(): Promise<Session> {
        const owner = await this.getPlayerSigner();
        const session = ethers.Wallet.createRandom();
        const scope = '0xffffffff';
        const ttl = 9999;

        const msg = [
            'Welcome to Dawnseekers!',
            '\n\nThis site is requesting permission to interact with your Dawnseekers assets.',
            '\n\nSigning this message will not incur any fees.',
            '\n\nYou can revoke sessions and read more about them at https://dawnseekers.com/sessions',
            '\n\nPermissions: send-actions, spend-energy',
            '\n\nValid: ' + ttl + ' blocks',
            '\n\nSession: ',
            session.address.toLowerCase()
        ].join('');

        const auth = await owner.signMessage(msg);
        await this.cog.mutate({
            mutation: SigninDocument,
            variables: { gameID, auth, ttl, scope, session: session.address },
            fetchPolicy: 'network-only'
        });

        return { key: session, owner: await owner.getAddress() };
    }

    async signin() {
        const session = await this.getSession();
        this.selectPlayer(session.owner);
        // auto create a seeker on signin if don't have one
        // FIXME: remove this once onboarding exists
        const player = this.getSelectedPlayer();
        if (!player || player.seekers.length == 0) {
            const sid = BigInt(session.owner) & BigInt('0xffffffff');
            const seeker = CompoundKeyEncoder.encodeUint160(NodeSelectors.Seeker, sid);
            await this.dispatch('SPAWN_SEEKER', seeker);
        }
    }

    private async renderPlugins(state: State) {
        return Promise.all(
            this.plugins.map((plugin) =>
                postMessagePromise(plugin, 'render', [state]).then((res: any) => {
                    // TODO: sanitise res.data html with DOMPurify
                    plugin.state = { ...plugin.state, ...res.data, id: plugin.id };
                })
            )
        );
    }

    // firected whenever something broadcasts a "selection" event
    async selectSeeker(selectedSeekerID: NodeID) {
        this.selection.seekerID = selectedSeekerID;
        return this.publish();
    }

    private getSelectedSeeker(): Seeker | undefined {
        if (this.selection.seekerID === undefined) {
            const player = this.getSelectedPlayer();
            if (player && player.seekers.length > 0) {
                const defaultSeeker = player.seekers[0];
                this.selection.seekerID = defaultSeeker.id;
            } else {
                return;
            }
        }
        return this.game.seekers.find((s) => s.id == this.selection.seekerID);
    }

    async selectTiles(selectedTileIDs: NodeID[]) {
        this.selection.tileIDs = selectedTileIDs;
        return this.publish();
    }

    private getSelectedTiles(): Tile[] {
        return this.selection.tileIDs
            .map((selectedTileID) => this.game.tiles.find((t) => t.id == selectedTileID))
            .filter((t): t is Tile => t !== undefined);
    }

    private getSelection(): SelectionState {
        return {
            seeker: this.getSelectedSeeker(),
            tiles: this.getSelectedTiles(),
            player: this.getSelectedPlayer()
        };
    }

    async selectPlayer(address: string) {
        if (!ethers.isAddress(address)) {
            console.error('selectPlayer: invalid address', address);
            return;
        }
        this.selection.playerAddr = address;
        // if we have switched players we need to invalidate the seeker selection
        const s = this.getSelectedSeeker();
        if (s && ethers.isAddress(s.owner.addr) && ethers.getAddress(s.owner.addr) != ethers.getAddress(address)) {
            this.selection.seekerID = undefined;
        }
        return this.publish();
    }

    private getSelectedPlayer(): Player | undefined {
        const address = this.selection.playerAddr;
        if (!address) {
            return undefined;
        }
        return this.game.players.find(
            (player) => ethers.isAddress(player.addr) && ethers.getAddress(player.addr) === ethers.getAddress(address)
        );
    }

    private getState(): State {
        return {
            ui: {
                selection: this.getSelection(),
                plugins: this.plugins.map((p) => ({ ...p.state, id: p.id })).sort()
            },
            game: this.game
        };
    }

    private async publish() {
        // build the full state
        const oldState = this.getState();
        // autoload/unload building plugins
        await this.autoloadBuildingPlugins();
        // tell all the plugins about the new state
        await Promise.all(this.plugins.map((plugin) => postMessagePromise(plugin, 'onState', [oldState])));
        // tell all the plugins to update their rendered views
        await this.renderPlugins(oldState);
        // rebuild the state again (since the plugins have updated)
        const latestState = this.getState();
        this.latestState = latestState;
        // emit the full state to all observers
        this.observers.forEach((obs) => (obs.next ? obs.next(latestState) : console.warn('subscriber without a next')));
    }

    async onPluginClick(pluginID: string, e: any) {
        const plugin = this.plugins.find((p) => p.id == pluginID);
        if (!plugin) {
            return;
        }
        const evt = { target: e.target ? e.target.id : null };
        postMessagePromise(plugin, 'onClick', [evt]).then(() => this.publish());
    }

    async onPluginSubmit(pluginID: string, e: any, values: { [key: string]: string }) {
        const plugin = this.plugins.find((p) => p.id == pluginID);
        if (!plugin) {
            return;
        }
        const evt = { target: e.target ? e.target.name : null };
        postMessagePromise(plugin, 'onSubmit', [evt, values]).then(() => this.publish());
    }

    async pluginDispatch(pluginID: string, action: string, ...args: any[]) {
        await this.publish(); // let plugins update loading states
        // if (!confirm(`plugin ${pluginID} wants to issue ${action}, let it?`)) {
        //     return;
        // }
        const plugin = this.plugins.find((p) => p.id == pluginID);
        if (!plugin) {
            return;
        }
        return this.dispatch(action, ...args);
    }
}

export function postMessagePromise(plugin: Plugin, type: string, args: any[]) {
    return new Promise((resolve, reject) => {
        const nonce = uuidv4();
        plugin.resolvers.set(nonce, { resolve, reject });
        plugin.worker.postMessage({ type, nonce, args });
    });
}

export function byNodeID(a: Node, b: Node) {
    return a.id > b.id ? -1 : 1;
}

export function byEdgeKey(a: Edge, b: Edge) {
    return a.key > b.key ? -1 : 1;
}

export function useDawnseekersState(ds: DawnseekersClient) {
    const [data, setData] = useState<State | null>(null);

    useEffect(() => {
        const sub = ds.subscribe({
            next(data) {
                setData(data);
                console.log(`useDawnseekersState: next`, data);
            },
            error(err) {
                console.error(`useDawnseekersState: ${err}`);
            },
            complete() {
                console.log('useDawnseekersState: closed');
            }
        });
        return () => {
            sub.unsubscribe();
        };
    }, [ds]);

    return { data };
}

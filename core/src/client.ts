/** @format */
import { v4 as uuidv4 } from 'uuid';
import { createClient as createHTTPClient, Client as HTTPClient, dedupExchange, fetchExchange } from '@urql/core';
import { cacheExchange } from '@urql/exchange-graphcache';
import { createClient as createWSClient, Client as WSClient } from 'graphql-ws';
import { Observable, Observer, Subscription } from 'zen-observable-ts';
import { PluginState, PluginSandbox, PluginConfig, QuickSandbox } from './sandbox';
import {
    GetStateDocument,
    GetStateQuery,
    GetStateQueryVariables,
    SigninDocument,
    DispatchDocument,
    DispatchMutation,
} from './gql/graphql';
import { ethers } from 'ethers';
import { GameState, NodeID, Node, Seeker, Player, Tile, gameStateTransformer } from './state';
import { CompoundKeyEncoder, NodeSelectors } from './utils';
import { StructuredLogger, Logger } from './logger';

import cogSchema from './gql/introspection';
const cogCache = cacheExchange({ schema: cogSchema });

const abi = ethers.AbiCoder.defaultAbiCoder();

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

const ACTIONS = new ethers.Interface([
    'function MOVE_SEEKER(uint32 sid, int16 q, int16 r, int16 s)',
    'function SCOUT_SEEKER(uint32 sid, int16 q, int16 r, int16 s)',
    'function SPAWN_SEEKER(bytes24 seeker)',
    'function DEV_SPAWN_SEEKER(address player, uint32 seekerID, int16 q, int16 r, int16 s)',
    'function DEV_SPAWN_TILE(uint8 kind, int16 q, int16 r, int16 s)',
]);

const gameID = 'DAWNSEEKERS';

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

export interface Session {
    owner: string;
    key: ethers.HDNodeWallet;
}

export interface UIState {
    selection: SelectionState;
    plugins: PluginState[];
}

export interface State {
    ui: UIState;
    game: GameState;
}

export type ActionDispatcher = (name: string, ...args: any) => Promise<unknown>;

export interface ClientConfig {
    wsEndpoint: string;
    httpEndpoint: string;
    provider: () => ethers.Provider;
    logger?: StructuredLogger;
}

export class Client {
    sandbox: PluginSandbox;
    selection: RawSelectionState;
    game: GameState;
    prevState: State;
    cog: HTTPClient;
    observers: Observer<State>[];
    session?: Session;
    logger: StructuredLogger;

    constructor({ httpEndpoint, wsEndpoint, logger }: ClientConfig) {
        this.logger = logger ? logger : new Logger();
        this.sandbox = new QuickSandbox({
            dispatcher: (name: string, ...args: any) => this.dispatch(name, ...args),
            logger: this.logger,
        });
        this.selection = { tileIDs: [] };
        this.game = { seekers: [], tiles: [], players: [] };
        this.observers = [];
        this.prevState = { game: this.game, ui: { selection: {}, plugins: [] } };

        // setup graphql client for comms with cog-services
        this.cog = createHTTPClient({
            url: httpEndpoint,
        });

        // query for the game state every N seconds
        this.pollState();

        // watch metamask account changes
        // TODO: this probably should be configurable, we should not assume metamask is being used
        const ethereum = (window as any | undefined)?.ethereum;
        if (ethereum) {
            ethereum.request({ method: 'eth_accounts' }).then((accounts: string[]) => this.selectPlayer(accounts[0]));
        }
    }

    private async pollState() {
        while (true) {
            try {
                const res = await this.cog.query(GetStateDocument, {}, { requestPolicy: 'network-only' }).toPromise();
                if (!res || !res.data) {
                    console.warn('query returned no data', res);
                } else {
                    this.onStateQueryData(res.data);
                }
            } catch (err) {
                this.onStateQueryError(err);
            }
            await sleep(2000);
        }
    }

    private onStateQueryError(err: any) {
        // TODO: ship this to all observers
        console.error('graphql', err);
    }

    private onStateQueryData(data: GetStateQuery) {
        this.game = gameStateTransformer(data);
        // keep the seeker selection data insync
        if (this.selection.seekerID) {
            const selectedSeeker = this.game.seekers.find((s) => s.id === this.selection.seekerID);
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
                .map((selectedTileID) => this.game.tiles.find((t) => t.id === selectedTileID))
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
            stateObserver.next(this.prevState); // push last known state immediately
            return () => {
                this.observers = this.observers.filter((obs) => obs !== stateObserver);
            };
        });
        return observable.subscribe(observer);
    }

    async load(plug: PluginConfig) {
        await this.sandbox.load(plug);
        await this.publish();
    }

    async unload(pluginID: string) {
        this.sandbox.unload(pluginID);
        return this.publish();
    }

    // async autoloadBuildingPlugins() {
    //     const selectedTiles = this.getSelectedTiles();
    //     const markedForRemoval: string[] = [];
    //     const selectedBuilding = (() => {
    //         if (!selectedTiles) {
    //             return undefined;
    //         }
    //         if (selectedTiles.length !== 1) {
    //             return undefined;
    //         }
    //         return selectedTiles[0].building;
    //     })();
    //     if (selectedBuilding) {
    //         const { kind } = selectedBuilding;
    //         // unload all building plugins not of correct kind
    //         this.plugins.forEach((plugin) => {
    //             if (plugin.type !== PluginType.BUILDING) {
    //                 return; // leave non-building plugins alone
    //             }
    //             if (plugin.addr !== kind.addr) {
    //                 markedForRemoval.push(plugin.id);
    //             }
    //         });
    //         // load any missing building plugins
    //         for (let i = 0; i < this.autoloadablePlugins.length; i++) {
    //             const plug = this.autoloadablePlugins[i];
    //             if (plug.type !== PluginType.BUILDING) {
    //                 continue;
    //             }
    //             if (plug.addr !== kind.addr) {
    //                 continue;
    //             }
    //             await this._load(plug);
    //         }
    //     } else {
    //         // mark all building plugins for removal
    //         this.plugins.forEach((plugin) => {
    //             if (plugin.type !== PluginType.BUILDING) {
    //                 return; // leave non-building plugins alone
    //             }
    //             markedForRemoval.push(plugin.id);
    //         });
    //     }
    //     // terminate and remove marked
    //     markedForRemoval.forEach((id) => {
    //         this.unload(id);
    //     });
    // }

    async dispatch(actionName: string, ...actionArgs: any) {
        console.log('dispatching:', actionName, actionArgs);
        const action = ACTIONS.encodeFunctionData(actionName, actionArgs);
        const actions = [action];
        const session = await this.getSession();
        const actionDigest = ethers.getBytes(
            ethers.keccak256(abi.encode(['bytes[]'], [actions.map((action) => ethers.getBytes(action))]))
        );
        const auth = await session.key.signMessage(actionDigest);
        const res = await this.cog.mutation(DispatchDocument, { gameID, auth, actions }).toPromise();
        // force an update
        // TODO: this should be done by invalidating the cache
        // await this.stateQuery.refetch();
        if (!res.data) {
            throw new Error('expected data got nothing');
        }
        return res.data;
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
            session.address.toLowerCase(),
        ].join('');

        const auth = await owner.signMessage(msg);
        const res = await this.cog
            .mutation(
                SigninDocument,
                { gameID, auth, ttl, scope, session: session.address },
                { requestPolicy: 'network-only' }
            )
            .toPromise();
        if (res.error) {
            throw new Error(`signin mutation fail: ${res.error}`);
        }
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
            player: this.getSelectedPlayer(),
        };
    }

    async selectPlayer(address: string | undefined) {
        if (!address) {
            this.selection.seekerID = undefined;
            return;
        }
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

    private getState(prevState: State): State {
        return {
            ui: {
                selection: this.getSelection(),
                plugins: this.sandbox.getState(prevState),
            },
            game: this.game,
        };
    }

    private async publish() {
        // rebuild the state again (since the plugins have updated)
        const nextState = this.getState(this.prevState);
        // emit the full state to all observers
        this.observers.forEach((obs) => (obs.next ? obs.next(nextState) : console.warn('subscriber without a next')));
        // mark start as prev
        this.prevState = nextState;
    }
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.byEdgeKey = exports.byNodeID = exports.DawnseekersClient = exports.PluginType = exports.PluginTrust = exports.BiomeKind = void 0;
const client_1 = require("@apollo/client");
const utilities_1 = require("@apollo/client/utilities");
const graphql_ws_1 = require("graphql-ws");
const subscriptions_1 = require("@apollo/client/link/subscriptions");
const zen_observable_ts_1 = require("zen-observable-ts");
const queries_1 = require("./queries");
const ethers_1 = require("ethers");
const ACTIONS = new ethers_1.ethers.Interface([
    "function MOVE_SEEKER(uint32 sid, int16 q, int16 r, int16 s)",
    "function SCOUT_SEEKER(uint32 sid, int16 q, int16 r, int16 s)",
    "function DEV_SPAWN_SEEKER(address player, uint32 seekerID, int16 q, int16 r, int16 s)",
    "function DEV_SPAWN_TILE(uint8 kind, int16 q, int16 r, int16 s)",
]);
const gameID = "DAWNSEEKERS";
var LocationKind;
(function (LocationKind) {
    LocationKind[LocationKind["UNKNOWN"] = 0] = "UNKNOWN";
    LocationKind[LocationKind["NEXT"] = 1] = "NEXT";
    LocationKind[LocationKind["PREV"] = 2] = "PREV";
})(LocationKind || (LocationKind = {}));
var BiomeKind;
(function (BiomeKind) {
    BiomeKind[BiomeKind["UNDISCOVERED"] = 0] = "UNDISCOVERED";
    BiomeKind[BiomeKind["DISCOVERED"] = 1] = "DISCOVERED";
})(BiomeKind = exports.BiomeKind || (exports.BiomeKind = {}));
var PluginTrust;
(function (PluginTrust) {
    PluginTrust[PluginTrust["UNTRUSTED"] = 0] = "UNTRUSTED";
    PluginTrust[PluginTrust["TRUSTED"] = 1] = "TRUSTED";
})(PluginTrust = exports.PluginTrust || (exports.PluginTrust = {}));
var PluginType;
(function (PluginType) {
    PluginType[PluginType["CORE"] = 0] = "CORE";
    PluginType[PluginType["BUILDING"] = 1] = "BUILDING";
})(PluginType = exports.PluginType || (exports.PluginType = {}));
const NodeSelectors = {
    Tile: new ethers_1.ethers.Interface([`function Tile()`]).getFunction("Tile")
        ?.selector,
};
const CompoundKeyEncoder = {
    encodeInt16(nodeSelector, ...keys) {
        return ethers_1.ethers.concat([
            ethers_1.ethers.getBytes(nodeSelector),
            ethers_1.ethers.getBytes(ethers_1.ethers.toBeHex(BigInt(0), 12)),
            ethers_1.ethers.getBytes(ethers_1.ethers.toBeHex(ethers_1.ethers.toTwos(BigInt(keys[0]), 16), 2)),
            ethers_1.ethers.getBytes(ethers_1.ethers.toBeHex(ethers_1.ethers.toTwos(BigInt(keys[1]), 16), 2)),
            ethers_1.ethers.getBytes(ethers_1.ethers.toBeHex(ethers_1.ethers.toTwos(BigInt(keys[2]), 16), 2)),
            ethers_1.ethers.getBytes(ethers_1.ethers.toBeHex(ethers_1.ethers.toTwos(BigInt(keys[3]), 16), 2)),
        ]);
    },
};
class DawnseekersClient {
    constructor({ httpEndpoint, wsEndpoint, autoloadablePlugins, corePlugins, fetch, webSocketImpl, privKey, }) {
        this.plugins = [];
        this.selection = { tileIDs: [] };
        this.game = { seekers: [], tiles: [], players: [] };
        this.autoloadablePlugins = autoloadablePlugins || [];
        this.observers = [];
        this.latestState = {
            game: this.game,
            ui: { selection: {}, plugins: [] },
        };
        this.privKey = privKey;
        // init core plugins
        if (corePlugins) {
            corePlugins.forEach((plug) => console.warn("loading core plugins not implemented", plug));
        }
        // setup graphql client for comms with cog-services
        const httpLink = new client_1.HttpLink({
            uri: httpEndpoint,
            fetch,
        });
        const wsLink = new subscriptions_1.GraphQLWsLink((0, graphql_ws_1.createClient)({
            url: wsEndpoint,
            webSocketImpl,
        }));
        const link = (0, client_1.split)(({ query }) => {
            const definition = (0, utilities_1.getMainDefinition)(query);
            return (definition.kind === "OperationDefinition" &&
                definition.operation === "subscription");
        }, wsLink, httpLink);
        this.cog = new client_1.ApolloClient({
            link,
            uri: httpEndpoint,
            cache: new client_1.InMemoryCache(),
        });
        // query for the game state every N seconds
        this.stateQuery = this.cog.watchQuery({
            query: queries_1.GetStateDocument,
            variables: {},
            pollInterval: 1000,
            fetchPolicy: "network-only",
        });
        this.stateQuery.subscribe({
            next: (result) => this.onStateQueryData(result.data),
            error: (err) => this.onStateQueryError(err),
        });
        // TODO: Implement other provider
        // watch metamask account changes
        // const ethereum = (window as any).ethereum;
        // ethereum.request({ method: 'eth_accounts' }).then((accounts: string[]) => this.selectPlayer(accounts[0]));
    }
    onStateQueryError(err) {
        // TODO: ship this to all observers
        console.error("graphql", err);
    }
    onStateQueryData(data) {
        // transform the raw query result into the nicely typed GameState shape
        const seekers = {};
        const tiles = {};
        const bags = {};
        const resources = {};
        const players = {};
        const getUnscoutedTile = (q, r, s) => {
            const t = Object.values(tiles).find(({ coords: t }) => t.q === q && t.r === r && t.s === s);
            if (t) {
                return null;
            }
            if (!NodeSelectors.Tile) {
                throw new Error("missing Tile selector");
            }
            return {
                id: CompoundKeyEncoder.encodeInt16(NodeSelectors.Tile, 0, q, r, s),
                coords: { q, r, s },
                bags: [],
                biome: BiomeKind.UNDISCOVERED,
            };
        };
        const getUnscoutedNeighbours = ({ coords: t }) => {
            return [
                getUnscoutedTile(t.q + 1, t.r, t.s - 1),
                getUnscoutedTile(t.q + 1, t.r - 1, t.s),
                getUnscoutedTile(t.q, t.r - 1, t.s + 1),
                getUnscoutedTile(t.q - 1, t.r, t.s + 1),
                getUnscoutedTile(t.q - 1, t.r + 1, t.s),
                getUnscoutedTile(t.q, t.r + 1, t.s - 1),
            ].filter((t) => !!t);
        };
        data.game.state.players.forEach((p) => {
            players[p.id] = {
                id: p.id,
                addr: p.addr,
                seekers: [], // come back for this later
            };
        });
        data.game.state.resources.forEach((r) => {
            resources[r.id] = {
                id: r.id,
            };
        });
        data.game.state.bags.forEach((b) => {
            bags[b.id] = {
                id: b.id,
                slots: b.slots.map((s) => ({
                    key: s.key,
                    balance: s.balance,
                    item: resources[s.resource.id], // FIXME: not just resources
                })),
            };
        });
        data.game.state.tiles.forEach((t) => {
            tiles[t.id] = {
                id: t.id,
                coords: {
                    q: Number(ethers_1.ethers.fromTwos(t.coords[1], 16)),
                    r: Number(ethers_1.ethers.fromTwos(t.coords[2], 16)),
                    s: Number(ethers_1.ethers.fromTwos(t.coords[3], 16)),
                },
                biome: t.biome === 1
                    ? BiomeKind.DISCOVERED
                    : BiomeKind.UNDISCOVERED,
                bags: t.bags
                    .map((b) => ({
                    key: b.key,
                    bag: bags[b.bag.id],
                }))
                    .sort(byEdgeKey),
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
                console.warn("ignoring ownerless seeker", s);
                return;
            }
            const locations = s.location
                .map((l) => {
                const tile = tiles[l.tile.id];
                if (!tile) {
                    return null;
                }
                return {
                    kind: l.key === 0
                        ? LocationKind.PREV
                        : l.key === 1
                            ? LocationKind.NEXT
                            : LocationKind.UNKNOWN,
                    validFrom: l.time,
                    tile: tile,
                };
            })
                .filter((l) => !!l);
            const next = locations.find((loc) => loc.kind == LocationKind.NEXT);
            if (!next) {
                console.warn("invalid seeker data: missing NEXT location", s.id);
                return;
            }
            const prev = locations.find((loc) => loc.kind == LocationKind.PREV);
            if (!prev) {
                console.warn("invalid seeker data: missing PREV location", s.id);
                return;
            }
            seekers[s.id] = {
                id: s.id,
                key: ethers_1.ethers.getBigInt(s.seekerID).toString(16),
                name: s.id,
                owner: players[s.owner.id],
                location: {
                    next,
                    prev,
                },
                bags: s.bags
                    .map((b) => ({
                    key: b.key,
                    bag: bags[b.bag.id],
                }))
                    .sort(byEdgeKey),
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
            players: Object.values(players).sort(byNodeID),
        };
        // keep the seeker selection data insync
        if (this.selection.seekerID) {
            const selectedSeeker = seekers[this.selection.seekerID];
            if (!selectedSeeker) {
                console.warn("selected seeker no longer found in state, removing selection", this.selection.seekerID);
                this.selection.seekerID = undefined;
            }
            else {
                this.selection.seekerID = selectedSeeker.id;
            }
        }
        // keep the tiles selection data insync
        if (this.selection.tileIDs) {
            const selectedTiles = this.selection.tileIDs
                .map((selectedTileID) => tiles[selectedTileID])
                .filter((t) => !!t);
            if (selectedTiles.length != this.selection.tileIDs.length) {
                console.warn("one or more selected tiles were not found in the state, removing selection");
                this.selection.tileIDs = [];
            }
            else {
                this.selection.tileIDs = selectedTiles.map((t) => t.id);
            }
        }
        // tell the world about it
        this.publish();
    }
    subscribe(observer) {
        const observable = new zen_observable_ts_1.Observable((stateObserver) => {
            this.observers.push(stateObserver);
            stateObserver.next(this.latestState); // push last known state immediately
            return () => {
                this.observers = this.observers.filter((obs) => obs !== stateObserver);
            };
        });
        return observable.subscribe(observer);
    }
    async dispatch(actionName, ...actionArgs) {
        console.log("dispatching:", actionName, actionArgs);
        const action = ACTIONS.encodeFunctionData(actionName, actionArgs);
        const res = await this._dispatchEncodedAction(action);
        // force an update
        await this.stateQuery.refetch();
        return res;
    }
    async _dispatchEncodedAction(action) {
        const session = await this.getSession();
        const actionDigest = ethers_1.ethers.getBytes(ethers_1.ethers.keccak256(action));
        const auth = await session.key.signMessage(actionDigest);
        return this.cog
            .mutate({
            mutation: queries_1.DispatchDocument,
            variables: { gameID, auth, action },
        })
            .then((res) => res.data.dispatch)
            .catch((err) => console.error(err));
    }
    // TODO: Support private key signer
    async getPlayerSigner() {
        if (this.privKey) {
            return new ethers_1.ethers.Wallet(this.privKey);
        }
        throw new Error(`metamask not installed and we havent implemented WalletConnect yet sorry`);
    }
    async getSession() {
        if (!this.session) {
            this.session = await this._getSessionSigner();
        }
        return this.session;
    }
    async _getSessionSigner() {
        const owner = await this.getPlayerSigner();
        const session = ethers_1.ethers.Wallet.createRandom();
        const msg = ethers_1.ethers.concat([
            ethers_1.ethers.toUtf8Bytes(`You are signing in with session: `),
            ethers_1.ethers.getAddress(session.address),
        ]);
        const auth = await owner.signMessage(ethers_1.ethers.getBytes(msg));
        await this.cog.mutate({
            mutation: queries_1.SigninDocument,
            variables: { gameID, auth, session: session.address },
            fetchPolicy: "network-only",
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
            const seekerID = BigInt(session.owner) & BigInt("0xffffffff");
            await this.dispatch("DEV_SPAWN_SEEKER", session.owner, seekerID, 0, 0, 0);
        }
    }
    // firected whenever something broadcasts a "selection" event
    async selectSeeker(selectedSeekerID) {
        this.selection.seekerID = selectedSeekerID;
        return this.publish();
    }
    getSelectedSeeker() {
        if (this.selection.seekerID === undefined) {
            const player = this.getSelectedPlayer();
            if (player && player.seekers.length > 0) {
                const defaultSeeker = player.seekers[0];
                this.selection.seekerID = defaultSeeker.id;
            }
            else {
                return;
            }
        }
        return this.game.seekers.find((s) => s.id == this.selection.seekerID);
    }
    async selectTiles(selectedTileIDs) {
        this.selection.tileIDs = selectedTileIDs;
        return this.publish();
    }
    getSelectedTiles() {
        return this.selection.tileIDs
            .map((selectedTileID) => this.game.tiles.find((t) => t.id == selectedTileID))
            .filter((t) => t !== undefined);
    }
    getSelection() {
        return {
            seeker: this.getSelectedSeeker(),
            tiles: this.getSelectedTiles(),
            player: this.getSelectedPlayer(),
        };
    }
    async selectPlayer(address) {
        if (!ethers_1.ethers.isAddress(address)) {
            console.error("selectPlayer: invalid address", address);
            return;
        }
        this.selection.playerAddr = address;
        // if we have switched players we need to invalidate the seeker selection
        const s = this.getSelectedSeeker();
        if (s &&
            ethers_1.ethers.isAddress(s.owner.addr) &&
            ethers_1.ethers.getAddress(s.owner.addr) != ethers_1.ethers.getAddress(address)) {
            this.selection.seekerID = undefined;
        }
        return this.publish();
    }
    getSelectedPlayer() {
        const address = this.selection.playerAddr;
        if (!address) {
            return undefined;
        }
        return this.game.players.find((player) => ethers_1.ethers.isAddress(player.addr) &&
            ethers_1.ethers.getAddress(player.addr) === ethers_1.ethers.getAddress(address));
    }
    getState() {
        return {
            ui: {
                selection: this.getSelection(),
                plugins: this.plugins.map((p) => p.state).sort(),
            },
            game: this.game,
        };
    }
    async publish() {
        const latestState = this.getState();
        this.latestState = latestState;
        // emit the full state to all observers
        this.observers.forEach((obs) => obs.next
            ? obs.next(latestState)
            : console.warn("subscriber without a next"));
    }
    async pluginDispatch(pluginID, action, ...args) {
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
exports.DawnseekersClient = DawnseekersClient;
function byNodeID(a, b) {
    return a.id > b.id ? -1 : 1;
}
exports.byNodeID = byNodeID;
function byEdgeKey(a, b) {
    return a.key > b.key ? -1 : 1;
}
exports.byEdgeKey = byEdgeKey;

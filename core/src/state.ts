import { GetStateQuery, StateFragmentFragmentDoc } from './gql/graphql';
import { useFragment } from './gql';
import { CompoundKeyEncoder, NodeSelectors } from './utils';
import { ethers } from 'ethers';

export type NodeID = string;

export interface Node {
    id: NodeID;
}

export interface Edge {
    key: number;
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
    PREV,
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
    bag: Bag;
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
    DISCOVERED = 1,
}

export interface Tile extends Node {
    id: NodeID;
    building?: Building;
    coords: TileCoords;
    bags: EquipSlot[];
    biome: BiomeKind;
    seekers: Seeker[];
}

export interface GameState {
    block: number;
    players: Player[];
    seekers: Seeker[];
    tiles: Tile[];
}

export function gameStateTransformer(data: GetStateQuery): GameState {
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
            biome: BiomeKind.UNDISCOVERED,
            seekers: [],
        };
    };

    const getUnscoutedNeighbours = ({ coords: t }: Tile) => {
        return [
            getUnscoutedTile(t.q + 1, t.r, t.s - 1),
            getUnscoutedTile(t.q + 1, t.r - 1, t.s),
            getUnscoutedTile(t.q, t.r - 1, t.s + 1),
            getUnscoutedTile(t.q - 1, t.r, t.s + 1),
            getUnscoutedTile(t.q - 1, t.r + 1, t.s),
            getUnscoutedTile(t.q, t.r + 1, t.s - 1),
        ].filter((t): t is Tile => !!t);
    };

    const state = useFragment(StateFragmentFragmentDoc, data.game.state);
    state.players.forEach((p) => {
        players[p.id] = {
            id: p.id,
            addr: p.addr,
            seekers: [], // come back for this later
        };
    });
    state.resources.forEach((r) => {
        resources[r.id] = {
            id: r.id,
        };
    });
    state.bags.forEach((b) => {
        bags[b.id] = {
            id: b.id,
            slots: b.slots.map((s) => ({
                key: s.key,
                balance: s.balance,
                item: resources[s.resource.id], // FIXME: not just resources
            })),
        };
    });
    state.tiles.forEach((t) => {
        tiles[t.id] = {
            id: t.id,
            coords: {
                q: Number(ethers.fromTwos(t.coords[1], 16)),
                r: Number(ethers.fromTwos(t.coords[2], 16)),
                s: Number(ethers.fromTwos(t.coords[3], 16)),
            },
            biome: t.biome === 1 ? BiomeKind.DISCOVERED : BiomeKind.UNDISCOVERED,
            bags: t.bags
                .map((b) => ({
                    key: b.key,
                    bag: bags[b.bag.id],
                }))
                .sort(byEdgeKey),
            seekers: [],
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

    state.seekers.forEach((s) => {
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
                    tile: tile,
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
    // put seekers on tiles
    Object.values(tiles).forEach((t) => {
        t.seekers = Object.values(seekers)
            .filter((s) => s.location.next.tile.id == t.id)
            .sort(byNodeID);
    });
    const game = {
        block: state.block,
        seekers: Object.values(seekers).sort(byNodeID),
        tiles: Object.values(tiles).sort(byNodeID),
        players: Object.values(players).sort(byNodeID),
    };

    return game;
}

export function byNodeID(a: Node, b: Node) {
    return a.id > b.id ? -1 : 1;
}

export function byEdgeKey(a: Edge, b: Edge) {
    return a.key > b.key ? -1 : 1;
}

import {
    EquipmentSlotFragment,
    SelectedPlayerFragment,
    SelectedSeekerFragment,
    SelectedTileFragment,
    World,
    WorldSeekerFragment,
    WorldTileFragment
} from '@dawnseekers/core';
import { ethers } from 'ethers';

enum OldLocationKind {
    UNKNOWN,
    NEXT,
    PREV
}

export interface OldLocation {
    kind: OldLocationKind;
    validFrom: number; // time
    tile: OldNode | null;
}
export interface OldSeeker {
    id: string;
    key: string;
    name: string;
    owner: {
        id: string;
    };
    bags: EquipmentSlotFragment[];
    location: {
        next: OldLocation;
        prev: OldLocation;
    };
}

export interface OldTileCoords {
    q: number;
    r: number;
    s: number;
}

interface OldNode {
    id: string;
}

export interface OldTile {
    id: string;
    building?: OldNode | null;
    coords: OldTileCoords;
    bags: EquipmentSlotFragment[];
    biome: number;
    seekers: OldSeeker[];
}

export interface OldPlayer {
    id: string;
    addr: string;
    seekers: OldSeeker[];
}

export interface OldMapState {
    ui: {
        selection: {
            player?: OldPlayer;
            seeker?: OldSeeker;
            tiles: OldTile[];
        };
        plugins: never[];
    };
    game: {
        players: OldPlayer[];
        seekers: OldSeeker[];
        tiles: OldTile[];
    };
}
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
//
// IMPORTANT: this whole file must be thrown away.
//
// we are munging the new state into the old state shape so the map doesn't break
// but the munging is lossy and we don't want to maintain it
//
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
export function dangerouslyHackStateForMap(
    world?: World,
    player?: SelectedPlayerFragment,
    selectedSeeker?: SelectedSeekerFragment,
    selectedTiles?: SelectedTileFragment[]
): OldMapState {
    const toOldTile = (t: WorldTileFragment): Omit<OldTile, 'seekers'> => ({
        id: t.id,
        // building: t.building || null, // this break the map?
        coords: {
            q: Number(ethers.fromTwos(t.coords[1], 16)),
            r: Number(ethers.fromTwos(t.coords[2], 16)),
            s: Number(ethers.fromTwos(t.coords[3], 16))
        },
        bags: t.bagCount > 0 ? [{ id: 'fake-equip-id', bag: { id: 'fake-bag-id', slots: [] }, key: 0 }] : [],
        biome: t.biome || 0
    });

    const oldTilesWithoutSeekers: Omit<OldTile, 'seekers'>[] = (world?.tiles || []).map((t) => ({
        ...toOldTile(t)
    }));

    const toOldSeeker = (s: WorldSeekerFragment): OldSeeker => ({
        id: s.id,
        key: BigInt(s.key).toString(16), // map doesn't like 0x-prefix
        name: s.id,
        owner: { id: s.owner?.id || 'hack-doesnt-know-owner-id' },
        bags: [], // ignored - dont care about other seeker bags
        location: {
            next: {
                kind: OldLocationKind.NEXT,
                validFrom: s.nextLocation?.time || 0,
                tile: oldTilesWithoutSeekers.find((t) => t.id === s.nextLocation?.tile.id) || null
            },
            prev: {
                kind: OldLocationKind.PREV,
                validFrom: s.prevLocation?.time || 0,
                tile: oldTilesWithoutSeekers.find((t) => t.id === s.prevLocation?.tile.id) || null
            }
        }
    });

    const oldSeekers: OldSeeker[] = (world?.tiles || []).flatMap((t) => t.seekers).map((s) => toOldSeeker(s));

    const oldTiles: OldTile[] = oldTilesWithoutSeekers.map((t) => ({
        ...t,
        seekers: oldSeekers.filter((s) => s.location.next.tile?.id === t.id)
    }));

    const oldPlayers = (world?.players || []).map((p) => ({
        id: p.id,
        addr: p.addr,
        seekers: oldSeekers.filter((s) => s.owner.id === p.id)
    }));

    return {
        ui: {
            selection: {
                player: player ? oldPlayers.find((p) => p.id == player.id) : undefined,
                seeker: selectedSeeker ? oldSeekers.find((s) => s.id == selectedSeeker.id) : undefined,
                tiles: (selectedTiles || [])
                    .map((st) => oldTiles.find((t) => st.id == t.id))
                    .filter((t): t is OldTile => !!t)
            },
            plugins: []
        },
        game: {
            players: oldPlayers,
            seekers: oldSeekers,
            tiles: oldTiles
        }
    };
}

import { EquipmentSlotFragment, GameState, WorldMobileUnitFragment, WorldTileFragment } from '@downstream/core';
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
export interface OldMobileUnit {
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
    mobileUnits: OldMobileUnit[];
}

export interface OldPlayer {
    id: string;
    addr: string;
    mobileUnits: OldMobileUnit[];
}

export interface OldMapState {
    ui: {
        selection: {
            intent?: string;
            player?: OldPlayer;
            mobileUnit?: OldMobileUnit;
            tiles: OldTile[];
        };
        plugins: never[];
    };
    game: {
        players: OldPlayer[];
        mobileUnits: OldMobileUnit[];
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
export function dangerouslyHackStateForMap({ player, selected, world }: Partial<GameState>): OldMapState {
    const { mobileUnit, tiles, intent } = selected || {};
    const toOldTile = (t: WorldTileFragment): Omit<OldTile, 'mobileUnits'> => ({
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

    const oldTilesWithoutMobileUnits: Omit<OldTile, 'mobileUnits'>[] = (world?.tiles || []).map((t) => ({
        ...toOldTile(t)
    }));

    const toOldMobileUnit = (s: WorldMobileUnitFragment): OldMobileUnit => ({
        id: s.id,
        key: BigInt(s.key).toString(16), // map doesn't like 0x-prefix
        name: s.id,
        owner: { id: s.owner?.id || 'hack-doesnt-know-owner-id' },
        bags: [], // ignored - dont care about other mobileUnit bags
        location: {
            next: {
                kind: OldLocationKind.NEXT,
                validFrom: s.nextLocation?.time || 0,
                tile: oldTilesWithoutMobileUnits.find((t) => t.id === s.nextLocation?.tile.id) || null
            },
            prev: {
                kind: OldLocationKind.PREV,
                validFrom: s.prevLocation?.time || 0,
                tile: oldTilesWithoutMobileUnits.find((t) => t.id === s.prevLocation?.tile.id) || null
            }
        }
    });

    const oldMobileUnits: OldMobileUnit[] = (world?.tiles || []).flatMap((t) => t.mobileUnits).map((s) => toOldMobileUnit(s));

    const oldTiles: OldTile[] = oldTilesWithoutMobileUnits.map((t) => ({
        ...t,
        mobileUnits: oldMobileUnits.filter((s) => s.location.next.tile?.id === t.id)
    }));

    const oldPlayers = (world?.players || []).map((p) => ({
        id: p.id,
        addr: p.addr,
        mobileUnits: oldMobileUnits.filter((s) => s.owner.id === p.id)
    }));

    return {
        ui: {
            selection: {
                intent,
                player: player ? oldPlayers.find((p) => p.id == player.id) : undefined,
                mobileUnit: mobileUnit ? oldMobileUnits.find((s) => s.id == mobileUnit.id) : undefined,
                tiles: (tiles || []).map((st) => oldTiles.find((t) => st.id == t.id)).filter((t): t is OldTile => !!t)
            },
            plugins: []
        },
        game: {
            players: oldPlayers,
            mobileUnits: oldMobileUnits,
            tiles: oldTiles
        }
    };
}

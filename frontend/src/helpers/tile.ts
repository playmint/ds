import { ethers } from 'ethers';
import { WorldTileFragment } from '@downstream/core';

export type Coords = Array<any>;
export interface Locatable {
    coords: Coords;
}

export function getTileDistance(t1: Locatable, t2: Locatable): number {
    if (!t1 || !t2) {
        return Infinity;
    }
    const a = getCoords(t1);
    const b = getCoords(t2);
    return (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.s - b.s)) / 2;
}

export function getCoords(t: Locatable) {
    return {
        q: Number(ethers.fromTwos(t.coords[1], 16)),
        r: Number(ethers.fromTwos(t.coords[2], 16)),
        s: Number(ethers.fromTwos(t.coords[3], 16)),
    };
}

function getCoordsArray(coords: any[]): [number, number, number] {
    return [
        Number(ethers.fromTwos(coords[1], 16)),
        Number(ethers.fromTwos(coords[2], 16)),
        Number(ethers.fromTwos(coords[3], 16)),
    ];
}

export function getTileByQRS(
    tiles: WorldTileFragment[],
    q: number,
    r: number,
    s: number
): WorldTileFragment | undefined {
    const coords = [0, q, r, s];
    return tiles.find((t) => t.coords.every((n, idx) => coords[idx] == Number(ethers.fromTwos(n, 16))));
}

export function getNeighbours(tiles: WorldTileFragment[], t: Pick<WorldTileFragment, 'coords'>): WorldTileFragment[] {
    const [q, r, s] = getCoordsArray(t.coords);
    return [
        getTileByQRS(tiles, q + 1, r, s - 1),
        getTileByQRS(tiles, q + 1, r - 1, s),
        getTileByQRS(tiles, q, r - 1, s + 1),
        getTileByQRS(tiles, q - 1, r, s + 1),
        getTileByQRS(tiles, q - 1, r + 1, s),
        getTileByQRS(tiles, q, r + 1, s - 1),
    ].filter((t): t is WorldTileFragment => !!t);
}

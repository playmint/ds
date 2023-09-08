import { ethers } from 'ethers';
import { SelectedTileFragment, WorldTileFragment } from '@downstream/core';

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

// https://www.notion.so/playmint/Extraction-6b36dcb3f95e4ab8a57cb6b99d24bb8f#cb8cc764f9ef436e9847e631ef12b157
export const GOO_GREEN = 0;
export const GOO_BLUE = 1;
export const GOO_RED = 2;

export const getSecsPerGoo = (atomVal: number) => {
    if (atomVal < 70) return 0;

    const x = atomVal - 70;
    const baseSecsPerGoo = 120 * Math.pow(0.985, x);

    if (atomVal >= 165) return Math.max(baseSecsPerGoo * 0.75, 20);
    else if (atomVal >= 155) return baseSecsPerGoo * 0.85;
    else return baseSecsPerGoo;
};

export const getGooPerSec = (atomVal: number) => {
    const secsPerGoo = getSecsPerGoo(atomVal);
    return secsPerGoo > 0 ? 1 / secsPerGoo : 0;
};

export const getGooName = (index: number) => {
    switch (index) {
        case GOO_GREEN:
            return 'green';
        case GOO_BLUE:
            return 'blue';
        case GOO_RED:
            return 'red';
    }

    return 'Unknown';
};

export const getGooRates = (tile: SelectedTileFragment) => {
    return tile.atoms && tile.atoms.length > 0
        ? tile.atoms
              .sort((a, b) => b.weight - a.weight)
              .map((elm) => {
                  return {
                      index: elm.key,
                      name: getGooName(elm.key),
                      gooPerSec: getGooPerSec(elm.weight),
                      weight: elm.weight,
                  };
              })
        : [];
};

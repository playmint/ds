import { getCoords, WorldBuildingFragment, WorldTileFragment } from '@app/../../core/src';
import { MinQueue } from 'heapify';
import { BuildingCategory, getBuildingCategory } from './building';
import { getBuildingAtTile } from '@downstream/core/src/utils';

interface PassableTile {
    idx: number;
    q: number;
    r: number;
    s: number;
    tile: WorldTileFragment;
}

export function getPath(
    tiles: WorldTileFragment[],
    buildings: WorldBuildingFragment[],
    fromWorldTile: WorldTileFragment,
    toWorldTile: WorldTileFragment
): WorldTileFragment[] {
    // put the tiles into a structure we can lookup by coords quickly
    const tileMap = new Map<string, PassableTile>();
    const tileList: PassableTile[] = [];
    const blockerMap = new Map<string, boolean>();
    let fromTile: PassableTile | null = null;
    let toTile: PassableTile | null = null;
    for (let idx = 0; idx < tiles.length; idx++) {
        const { q, r, s } = getCoords(tiles[idx]);
        const t = {
            idx,
            q,
            r,
            s,
            tile: tiles[idx],
        };
        // ignore tiles with blockers on them
        const building = getBuildingAtTile(buildings, t.tile);
        const key = `${q}:${r}:${s}`;
        if (building && getBuildingCategory(building?.kind) === BuildingCategory.BLOCKER) {
            blockerMap.set(key, true);
        }
        tileMap.set(key, t);
        tileList.push(t);
        if (fromWorldTile.id === tiles[idx].id) {
            fromTile = t;
        } else if (toWorldTile.id === tiles[idx].id) {
            toTile = t;
        }
    }
    if (fromTile === null) {
        return [];
    }
    if (toTile === null) {
        return [];
    }
    if (fromTile === toTile) {
        return [];
    }
    return findPathAStar(tileMap, blockerMap, tileList, fromTile, toTile).map((idx) => tiles[idx]);
}

interface Neighbour extends PassableTile {
    distance: number;
}

// find valid neighbours and track distance compared to destination tile this
// is bit different from standard A* as it biases toward tiles that are closer
// to destination... this bias helps it find a path quicker at the cost of
// possibly not being the actual shortest path
function getNeighboursWithDistanceFromDestination(
    tileMap: Map<string, PassableTile>,
    blockerMap: Map<string, boolean>,
    current: PassableTile,
    destination: PassableTile
): Neighbour[] {
    const { q, r, s } = current;
    return [
        { q: q + 1, r: r, s: s - 1 },
        { q: q + 1, r: r - 1, s: s },
        { q: q, r: r - 1, s: s + 1 },
        { q: q - 1, r: r, s: s + 1 },
        { q: q - 1, r: r + 1, s: s },
        { q: q, r: r + 1, s: s - 1 },
    ]
        .filter(({ q, r, s }) => !blockerMap.get(`${q}:${r}:${s}`))
        .map(({ q, r, s }) => tileMap.get(`${q}:${r}:${s}`))
        .filter((t): t is PassableTile => {
            if (!t) {
                return false;
            }
            // always allow the dest tile, even if it's a blocker this allows
            // us to show the path, but indicate that it is invalid
            if (t.tile.id === destination.tile.id) {
                return true;
            }
            return true;
        })
        .map((neighbour) => ({
            distance:
                (Math.abs(destination.q - neighbour.q) +
                    Math.abs(destination.r - neighbour.r) +
                    Math.abs(destination.s - neighbour.s)) /
                2,
            ...neighbour,
        }));
}

// basic A* implementation
function findPathAStar(
    tileMap: Map<string, PassableTile>,
    blockerMap: Map<string, boolean>,
    tileList: PassableTile[],
    fromTile: PassableTile,
    toTile: PassableTile
): number[] {
    const queue = new MinQueue(3000);
    const prev = new Map<number, number | undefined>();
    const cost = new Map<number, number>();

    queue.push(fromTile.idx, 0);
    prev.set(fromTile.idx, undefined);
    cost.set(fromTile.idx, 0);

    while (queue.size > 0) {
        const current = queue.pop();
        if (typeof current === 'undefined') {
            throw new Error('nothing in queue');
        }

        if (current === toTile.idx) {
            break;
        }

        const currentTile = tileList[current];
        if (typeof currentTile === 'undefined') {
            throw new Error('invalid index in queue');
        }
        getNeighboursWithDistanceFromDestination(tileMap, blockerMap, currentTile, toTile).forEach(
            ({ idx, distance }: Neighbour) => {
                const newCost = (cost.get(current) || 0) + distance * 10;
                if (!cost.has(idx) || newCost < (cost.get(idx) || 0)) {
                    cost.set(idx, newCost);
                    prev.set(idx, current);

                    const priority = newCost + 1;
                    queue.push(idx, priority);
                }
            }
        );
    }

    const path: number[] = [];
    let current: number | undefined = toTile.idx;
    while (typeof current !== 'undefined' && current !== fromTile.idx) {
        path.push(current);
        current = prev.get(current);
    }
    return path.reverse();
}

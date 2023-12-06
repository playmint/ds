import { getCoords, WorldBuildingFragment, WorldTileFragment } from '@app/../../core/src';
import { MinQueue } from 'heapify';
import { getBuildingAtTile } from '@downstream/core/src/utils';

interface PassableTile {
    idx: number;
    q: number;
    r: number;
    s: number;
    tile: WorldTileFragment;
    cost: number;
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
            cost: 0,
        };
        const building = getBuildingAtTile(buildings, t.tile);
        const key = `${q}:${r}:${s}`;
        if (building && building.kind && parseInt('0x'+building.kind.id.slice(-2)) === 1) {
            t.cost = 500;
        } else if (building && building.kind && parseInt('0x'+building.kind.id.slice(-2)) === 5) {
            t.cost = 400;
        } else if (building) {
            t.cost = 300;
        } else {
            t.cost = 10;
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
    return findPathAStar(tileMap, tileList, fromTile, toTile).map((idx) => tiles[idx]);
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
        .reduce((neighbours, { q, r, s }) => {
            const t = tileMap.get(`${q}:${r}:${s}`);
            if (!t) {
                return neighbours;
            }
            neighbours.push(t);
            return neighbours;
        }, [] as PassableTile[])
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
        getNeighboursWithDistanceFromDestination(tileMap, currentTile, toTile).forEach(
            ({ idx, distance }: Neighbour) => {
                const newCost = (cost.get(current) || 0) + distance * currentTile.cost;
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

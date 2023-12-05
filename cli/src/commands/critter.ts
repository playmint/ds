import { pipe, take, toPromise } from 'wonka';
import { CompoundKeyEncoder, NodeSelectors, getCoords } from "@downstream/core";
import { GetTilesDocument, GetWorldDocument, WorldBuildingFragment, WorldStateFragment, WorldTileFragment } from '@downstream/core/src/gql/graphql';
import { getPath } from '../utils/pathfinding';

const CRITTER_SPAWN_LOCATIONS = {
    a: [-18, 0, 18],
    b: [-2, 25, -23],
    c: [25, 4, -29],
    d: [33, -31, -2],
};

const spawn = {
    command: 'spawn',
    describe: 'spawn a critter',
    builder: (yargs) => {
        yargs.option('spawn-point', {
            describe: 'which spawn point',
            type: 'string',
            choices: Object.keys(CRITTER_SPAWN_LOCATIONS),
            default: 'a',
        })
        yargs.option('radius', {
            describe: 'size of thingy',
            type: 'number',
            default: 10,
        })
    },
    handler: async (ctx) => {
        const player = await ctx.player();

        const [q, r, s] = CRITTER_SPAWN_LOCATIONS[ctx.spawnPoint];
        // spawn a unit
        const unitKey = BigInt(Math.floor(Math.random() * 100000))
        const unitId = CompoundKeyEncoder.encodeUint160( NodeSelectors.Critter, unitKey);
        const randomSize = [10,15,20,25][Math.floor(Math.random() * 4)];
        await player.dispatchAndWait({ name: 'SPAWN_CRITTER', args: [unitId, randomSize || 10] }, {name: 'MOVE_CRITTER', args: [unitId, q, r, s]});


    },
};

interface CritterState {
    id: string;
    prevCoords: {q: number, r: number, s: number};
    nextCoords: {q: number, r: number, s: number};
    prevTile: string;
    nextTile: string;
    health: number;
    mode: 'target' | 'random';
    target: {q: number, r: number, s: number};
    radius: number;
}

const ticker = {
    command: 'ticker',
    describe: 'drive the critter ai and ticks',
    builder: (yargs) => {
        yargs.option('spawn-point', {
            describe: 'which spawn point',
            type: 'string',
            choices: Object.keys(CRITTER_SPAWN_LOCATIONS),
            default: 'a',
        })
    },
    handler: async (ctx) => {
        const player = await ctx.player();

        // load the tiles
        const client = await ctx.client();
        const res: any = await pipe(client.query(GetTilesDocument, { gameID: ctx.game }, {subscribe: false}), take(1), toPromise);
        const tiles = res.game.state.tiles as WorldTileFragment[];
        const validCoords = tiles.map(getCoords);

        // state
        const critters: Map<string, CritterState> = new Map<string, CritterState>;

        // move unit around randomly
        while (true) {
            console.log('\n\n\n');
            console.log('------------------TICK---------------');

            // fetch the world
            let world;
            try {
                const res: any = await pipe(client.query(GetWorldDocument, { gameID: ctx.game }, {subscribe: false}), take(1), toPromise);
                if (!res?.game?.state) {
                    console.log('query error: unexpected empty response');
                    await sleep(500);
                    continue;
                }
                world = res.game.state as WorldStateFragment;
            } catch (err) {
                console.log(err);
                await sleep(500);
                continue;
            }

            // debug - chase me
            const unit = world.mobileUnits.find(() => true);
            const unitTile = tiles.find(t => t.id === unit?.nextLocation?.tile?.id);
            console.log(unitTile);

            // update critter state
            world.critters.forEach((critter) => {
                let c: CritterState | undefined = critters.get(critter.id);
                // const prevCoords = getCoords(critter.prevLocation.tile);
                const nextTile = critter.nextLocation.tile.id;
                const prevTile = critter.prevLocation.tile.id;
                const nextCoords = getCoords(critter.nextLocation.tile);
                const prevCoords = getCoords(critter.prevLocation.tile);
                if (!c) {
                    c = {
                        id: critter.id,
                        nextTile,
                        prevTile,
                        prevCoords,
                        nextCoords,
                        health: 100,
                        target: {q:20,r:0,s:-20},
                        mode: 'target',
                        radius: 1,
                    }
                }
                // c.prevCoords = prevCoords;
                c.prevCoords = prevCoords;
                c.nextCoords = nextCoords;
                c.prevTile = prevTile;
                c.nextTile = nextTile;
                c.target = unitTile ? getCoords(unitTile) : c.target,
                critters.set(critter.id, c);
            });

            const tx: Array<Promise<any>> = [sleep(Math.floor(Math.random() * 500))];

            // movement
            for (let [_id, critter] of critters) {
                if (critter.mode === 'random') {
                    let {q,r,s} = critter.nextCoords;
                    const validNeighbours = getNeighbourCoords(q,r,s)
                        .filter((nc) => validCoords.some((vc) => `${nc.q}:${nc.r}:${nc.s}` === `${vc.q}:${vc.r}:${vc.s}`))
                        .map(({q,r,s}) => [q,r,s]);
                    [q,r,s] = validNeighbours[Math.floor(Math.random() * validNeighbours.length)] || [0,0,0];
                    let backtrackAvoids = 0;
                    while (backtrackAvoids < 5 && q === critter.prevCoords.q && r === critter.prevCoords.r && s === critter.prevCoords.s) {
                        console.log(critter.id, '- avoiding backtrack attempt', backtrackAvoids);
                        [q,r,s] = validNeighbours[Math.floor(Math.random() * validNeighbours.length)] || [0,0,0];
                        backtrackAvoids++;
                    }
                    console.log(critter.id, '- MOVE (random)', q, r, s);
                    tx.push(
                        player.dispatch(
                            { name: 'MOVE_CRITTER', args: [critter.id, q, r, s] }
                        ).then(res => res.wait()).catch((err) => console.error(err))
                    );
                } else if (critter.mode === 'target') {
                    const fromTile = tiles.find((t) => t.id === critter.nextTile);
                    if (!fromTile) {
                        console.log(critter.id, `- targeting - fromTile ${critter.nextTile} not found`);
                        continue;
                    }
                    const targetTileId = CompoundKeyEncoder.encodeInt16( NodeSelectors.Tile, 0, critter.target.q, critter.target.r, critter.target.s);
                    const toTile = tiles.find((t) => t.id === targetTileId);
                    if (!toTile) {
                        console.log(critter.id, `- targeting - toTile ${JSON.stringify(critter.target)} not found`);
                        continue;
                    }
                    const path = getPath(tiles, world?.buildings || [], fromTile, toTile);
                    const isImposible = path.length === 1 && getTileDistance(fromTile, toTile) > 1;
                    if (isImposible) {
                        console.log(critter.id, `- targeting - isImposible`);
                        continue;
                    }
                    // console.log(path.map(p => p.id));
                    const targetTile = path.shift();
                    if (!targetTile) {
                        console.log(critter.id, `- targeting - no first step in path`);
                        continue;
                    }
                    // if there is a building on the target tile, then do nothing
                    // we have to wait til the building is destroyed to progress
                    const targetHasBuilding = targetTile ? getBuildingAtTile(world?.buildings || [], targetTile) : false;
                    if (targetHasBuilding) {
                        console.log(critter.id, '- MOVE_CRITTER (blocked/attacking)');
                    } else {
                        const {q,r,s} = getCoords(targetTile);
                        console.log(critter.id, `- MOVE_CRITTER (target)`, q, r, s);
                        tx.push(
                            player.dispatch(
                                { name: 'MOVE_CRITTER', args: [critter.id, q, r, s] }
                            ).then(res => res.wait()).catch((err) => console.error(err))
                        );
                    }
                }
            };

            // damage
            world.buildings.forEach((building) => {
                for (let [_id, critter] of critters) {
                    const critterTile = tiles.find(t => t.id === critter.nextTile);
                    if (!critterTile) {
                        console.log('no critterTile');
                        continue;
                    }
                    const buildingTile = tiles.find(t => t.id === building.location?.tile?.id);
                    if (!buildingTile) {
                        console.log('no buildingTile');
                        continue;
                    }
                    const distance = getTileDistance(critterTile, buildingTile);
                    const bag = (world?.bags || []).find(b => b.equipee?.node?.id === critter.id && b.equipee?.key === 100);
                    const size = (bag?.slots || []).find((slot) => slot.key === 1)?.balance || 0;
                    const radius = size / 10.0;
                    const strength = Math.max(5 - distance, 1);
                    if (distance <= radius) {
                        console.log(building.id, 'IS HIT BY', critter.id);
                        tx.push(
                            player.dispatch(
                                { name: 'ATTACK', args: [critter.id, building.id, strength] }
                            ).then(res => res.wait()).catch((err) => console.error(err))
                        );
                    }
                }
            });

            console.log('-------------------------------------');

            await Promise.all(tx);
        }
    },
};

export const critter = {
    command: 'critter',
    describe: 'critter control',
    builder: (yargs) =>
        yargs
            .command(spawn)
            .command(ticker)
};

function getNeighbourCoords(q, r, s) {
    return [
        { q: q + 1, r: r, s: s - 1 },
        { q: q + 1, r: r - 1, s: s },
        { q: q, r: r - 1, s: s + 1 },
        { q: q - 1, r: r, s: s + 1 },
        { q: q - 1, r: r + 1, s: s },
        { q: q, r: r + 1, s: s - 1 },
    ];
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export type Coords = Array<any>;
interface Locatable {
    coords: Coords;
}
function getTileDistance(t1: Locatable, t2: Locatable): number {
    if (!t1 || !t2) {
        return Infinity;
    }
    const a = getCoords(t1);
    const b = getCoords(t2);
    return (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.s - b.s)) / 2;
}

function getBuildingAtTile(buildings: WorldBuildingFragment[], tile: { id: string }) {
    return buildings.find((b) => b.location && b.location.tile.id === tile.id);
}



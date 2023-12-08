import { pipe, take, toPromise } from 'wonka';
import { CogAction, CompoundKeyEncoder, NodeSelectors, getCoords } from "@downstream/core";
import { BuildingKindFragment, GetTilesDocument, GetWorldDocument, WorldBuildingFragment, WorldStateFragment, WorldTileFragment } from '@downstream/core/src/gql/graphql';
import { getPath } from '../utils/pathfinding';

const CRITTER_SPAWN_LOCATIONS = [
    [-18, 0, 18],
    [-2, 25, -23],
    [25, 4, -29],
    [33, -31, -2],
];

const CRITTER_TARGET_LOCATIONS = [
    [0,0,0],
    [-6,5,1],
    [5,-1,-4],
];

const spawn = {
    command: 'spawn',
    describe: 'spawn a critter',
    builder: (yargs) => {
        yargs.option('spawn-point', {
            describe: 'which spawn point',
            type: 'number',
            default: 1,
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

let spawnCount = 0;
const randomSpawnQRS = () => {
    spawnCount++;
    return CRITTER_SPAWN_LOCATIONS[spawnCount % CRITTER_SPAWN_LOCATIONS.length];
}

let targetCount = 0;
const randomTargetQRS = () => {
    targetCount++;
    return CRITTER_TARGET_LOCATIONS[targetCount % CRITTER_TARGET_LOCATIONS.length];
}

const ticker = {
    command: 'ticker',
    describe: 'drive the critter ai and ticks',
    builder: (yargs) => {
        yargs.option('reset', {
            describe: 'send any live critters home on start',
            type: 'boolean',
            default: false,
        })
        yargs.option('critters', {
            describe: 'initial number of critters',
            type: 'number',
            default: 2,
        })
        yargs.option('interval', {
            describe: 'interval between waves',
            type: 'number',
            default: 100,
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
        let aggro = false;
        let startBlock:number = 0;
        let critterCount = ctx.critters;
        let sendHome = !!ctx.reset;

        const spawnCritter = (): Array<CogAction> => {
            const [q, r, s] = randomSpawnQRS();
            const unitKey = BigInt(Math.floor(Math.random() * 100000))
            const unitId = CompoundKeyEncoder.encodeUint160( NodeSelectors.Critter, unitKey);
            const randomSize = [10,15,20,25][Math.floor(Math.random() * 4)];
            return [{ name: 'SPAWN_CRITTER', args: [unitId, randomSize || 10] }, {name: 'MOVE_CRITTER', args: [unitId, q, r, s]}];
        }

        // move unit around randomly
        while (true) {
            console.log('\n\n\n');
            console.log(`------------------TICK ${aggro ? 'AGGRO' : 'RANDO'}---------------`);
            let tx: Array<CogAction> = [];
            const critters: Map<string, CritterState> = new Map<string, CritterState>;

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

            // note a start time for this ai run
            if (!startBlock) {
                startBlock = world.block;
            }

            // auto spawn critter if none
            if (world.critters.filter(c => !!c.nextLocation).length === 0) {
                // reset wave
                startBlock = world.block;
                aggro = false;
                // spawns
                for (let i=0; i<critterCount; i++) {
                    tx = [...tx, ...spawnCritter()];
                }
                critterCount++; // there will be more next time
            } else if (sendHome) {
                sendHome = false;
                const actions = world.critters.filter(c => !!c.nextLocation).map((c) => {
                    const [q,r,s] = randomSpawnQRS();
                    return {
                        name: 'MOVE_CRITTER',
                        args: [c.id, q, r, s],
                    }
                })
                console.log('sending the critters home');
                await player.dispatch(...actions)
                        .then(res => res.wait())
                        .catch((err) => console.error(err));
                continue;
            }

            // debug - chase me
            const chaseMe = false;
            const unit = world.mobileUnits.find(() => true);
            const unitTile = tiles.find(t => t.id === unit?.nextLocation?.tile?.id);

            // trigger wave start (if it isn't already)
            // triggers every ctx.interval blocks
            const tick = world.block - startBlock;
            if (!aggro) {
                console.log(`critters get aggro in ${ctx.interval - (tick % ctx.interval)} blocks`);
            }
            if (tick > 0 && tick % ctx.interval === 0) {
                aggro = true;
            }

            // update critter state
            world.critters.forEach((critter) => {
                if (!critter.nextLocation || !critter.prevLocation) {
                    return;
                }
                let c: CritterState | undefined = critters.get(critter.id);
                const nextTile = critter.nextLocation?.tile.id;
                const prevTile = critter.prevLocation?.tile.id;
                const nextCoords = getCoords(critter.nextLocation?.tile);
                const prevCoords = getCoords(critter.prevLocation?.tile);
                const spawner = randomSpawnQRS();
                if (!c) {
                    c = {
                        id: critter.id,
                        nextTile,
                        prevTile,
                        prevCoords,
                        nextCoords,
                        health: 100,
                        target: {q:spawner[0], r:spawner[1], s:spawner[2]},
                        mode: 'random',
                        radius: 1,
                    }
                }
                // c.prevCoords = prevCoords;
                c.prevCoords = prevCoords;
                c.nextCoords = nextCoords;
                c.prevTile = prevTile;
                c.nextTile = nextTile;
                c.mode = aggro ? 'target' : 'random';
                if (chaseMe) {
                    c.mode = 'target';
                    c.target = unitTile ? getCoords(unitTile) : {q:spawner[0], r:spawner[1], s:spawner[2]};
                } else if (aggro) {
                    const hq = randomTargetQRS();
                    c.mode = 'target';
                    c.target = {q: hq[0], r:hq[1], s:hq[2]};
                } else {
                    c.mode = 'random';
                }
                critters.set(critter.id, c);
            });

            // movement
            for (let [_id, critter] of critters) {

                const feelingRandom = Math.floor(Math.random() * 100) > 75;

                if (feelingRandom || critter.mode === 'random') {
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
                    tx = [...tx, { name: 'MOVE_CRITTER', args: [critter.id, q, r, s] }];
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
                    } else if (Array.from(critters.values()).some(c => c.nextTile === targetTile.id)) {
                        console.log(critter.id, '- MOVE_CRITTER (occupied)');
                    } else {
                        const nextCoords = getCoords(targetTile);
                        const {q,r,s} = nextCoords;
                        console.log(critter.id, `- MOVE_CRITTER (target)`, q, r, s);
                        critter.nextTile = targetTile.id;
                        critter.nextCoords = nextCoords;
                        tx = [...tx, { name: 'MOVE_CRITTER', args: [critter.id, q, r, s] }];
                    }
                }
            };

            // damage
            world.buildings.filter(b => !!b.location?.tile).forEach((building) => {
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
                    const hp = Math.max(25 - (distance * 8), 1);
                    if (distance <= radius) {
                        // critter attack building
                        console.log(building.id, `TOOK ${hp} DAMAGE FROM`, critter.id);
                        tx = [...tx, { name: 'ATTACK', args: [critter.id, building.id, Math.max(hp-4, 1)] }];

                        // tower attack critter
                        if (getBuildingCategory(building.kind) == BuildingCategory.TOWER) {
                            console.log(critter.id, `TOOK ${hp} DAMAGE FROM`, building.id);
                            tx = [...tx, { name: 'ATTACK', args: [building.id, critter.id, hp+1] }];
                        }
                    }
                }
            });

            console.log('dispatching', tx.length, 'actions');
            await player.dispatchAndWait(...tx)
                .then(() => console.log('OK'))
                .catch((err) => console.error(err));
            await sleep(1200);
            console.log('-------------------------------------');
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
    return buildings.find((b) => b.location && b.location?.tile.id === tile.id);
}



export enum BuildingCategory {
    NONE,
    BLOCKER,
    EXTRACTOR,
    ITEM_FACTORY,
    CUSTOM,
    TOWER,
}
export function getBuildingCategory(kind?: BuildingKindFragment | null) {
    if (!kind) {
        return BuildingCategory.NONE;
    }

    const buildingCategory = parseInt('0x' + kind.id.slice(-2));
    switch (buildingCategory) {
        case BuildingCategory.BLOCKER:
            return BuildingCategory.BLOCKER;
        case BuildingCategory.EXTRACTOR:
            return BuildingCategory.EXTRACTOR;
        case BuildingCategory.ITEM_FACTORY:
            return BuildingCategory.ITEM_FACTORY;
        case BuildingCategory.TOWER:
            return BuildingCategory.TOWER;
        default:
            return BuildingCategory.NONE;
    }
}

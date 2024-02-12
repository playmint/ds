import { ethers } from 'ethers';
import { pipe, take, toPromise } from 'wonka';
import { CompoundKeyEncoder, NodeSelectors, getCoords, WorldTileFragment } from "@downstream/core";
import { getBuildingAtTile } from '@downstream/core/src/utils';
import util from 'node:util';
import { spawn } from 'node:child_process';
import { getWorld } from './get';

const spawnAsync = util.promisify(spawn);

const concurrency = {
    command: 'concurrency',
    describe: 'put the target deployment under siege',
    builder: (yargs) =>
        yargs
            .option('max-connections', {
                alias: 'c',
                describe: 'number of player connections to spawn',
                type: 'number',
            })
            .option('buildings', {
                alias: 'b',
                describe: 'list of BuildingKind ids to randomly place to randomly place',
                type: 'string',
            })
    ,
    handler: async (ctx) => {
        const maxConnections: number = ctx.maxConnections || 1;
        const buildings = ctx.buildings ? ctx.buildings : undefined;

        // generate wallets
        const wallets: ethers.HDNodeWallet[] = [];
        for (let i=-1; i<maxConnections; i++) {
            wallets.push(ethers.Wallet.createRandom());
        }

        // for each wallet spawn a process with a chaos beaver
        const procs: ReturnType<typeof spawnAsync>[] = [];
        for (let wallet of wallets) {
            console.log(`starting chaos-unit for ${wallet.privateKey}`);
            procs.push(spawnAsync('ds', [
                '-n', `${ctx.network || 'local'}`,
                `-k`, `${wallet.privateKey}`,
                `-b`, `${buildings ? buildings : '0x0'}`,
                `test`, `chaos-unit`
            ], {stdio: ['ignore', process.stdout, process.stderr]}));
        }

        console.log('running, ctrl+c to stop');
        await Promise.all(procs);
    },
};

const chaosUnit = {
    command: 'chaos-unit',
    describe: 'spawn a unit and keep moving it',
    builder: (yargs) =>
        yargs
            .option('buildings', {
                alias: 'b',
                describe: 'list of BuildingKind ids to randomly place to randomly place',
                type: 'string',
            })
    ,
    handler: async (ctx) => {
        const player = await ctx.player();

        // spawn a unit
        const unitKey = BigInt(Math.floor(Math.random() * 100000))
        const unitId = CompoundKeyEncoder.encodeUint160( NodeSelectors.MobileUnit, unitKey);
        await player.dispatchAndWait({ name: 'SPAWN_MOBILE_UNIT', args: [unitId] });

        // load the tiles
        const client = await ctx.client();
        const res: any = await pipe(client.query(GET_TILES, { gameID: ctx.game }, {subscribe: false}), take(1), toPromise);
        const validCoords = res.game.state.tiles.map(getCoords);
        const buildings:string[] = ctx.buildings ? ctx.buildings.split(",") : [];

        // move unit around randomly
        let [q,r,s] = [0,0,0];
        while (true) {
            const validNeighbours = getNeighbourCoords(q,r,s)
                .filter((nc) => validCoords.some((vc) => `${nc.q}:${nc.r}:${nc.s}` === `${vc.q}:${vc.r}:${vc.s}`))
                .map(({q,r,s}) => [q,r,s]);
            [q,r,s] = validNeighbours[Math.floor(Math.random() * validNeighbours.length)] || [0,0,0];

            await player.dispatch({ name: 'MOVE_MOBILE_UNIT', args: [unitKey, q, r, s] }).then(res => res.wait());
            await sleep(Math.floor(Math.random() * 2000)); // jitter

            // place building
            if (buildings?.length > 0){
                let selectedBuilding = buildings[Math.floor(Math.random() * buildings.length)];
                    // WORK IN PROGRESS...
                    // Trying to make sure there's not already a buildin on the tile
                // console.log(`I want to place: ${selectedBuilding}`);
                //const world = await getWorld(ctx);
                // const coords = world.buildings[Math.floor(Math.random() * world.buildings.length)]?.location?.tile?.coords // random building in world
                //const coords = world.buildings[5]?.location?.tile?.coords;

                const tileMap = new Map<string, PassableTile>();
                const t = tileMap.get(`${q}:${r}:${s}`);
                console.log(t);
                
                //getBuildingAtTile(world.buildings, t.id);
                //console.log(coords);
                await player.dispatch({ name: 'DEV_SPAWN_BUILDING', args: [selectedBuilding, q, r, s] }).then(res => res.wait());
            }
        }
    },
};

// probably remove? vvv (along with other stuff)
interface PassableTile {
    idx: number;
    q: number;
    r: number;
    s: number;
    tile: WorldTileFragment;
}

export const test = {
    command: 'test',
    describe: 'internal test tooling',
    builder: (yargs) =>
        yargs
            .command(chaosUnit)
            .command(concurrency)
};

const GET_TILES = `query GetTiles($gameID: ID!) {
    game(id: $gameID) {
        state(simulated: true) {
            tiles: nodes(match: { kinds: ["Tile"] }) {
                coords: keys
            }
        }
    }
}`;

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

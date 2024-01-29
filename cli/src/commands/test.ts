import { ethers } from 'ethers';
import { pipe, take, toPromise } from 'wonka';
import { CompoundKeyEncoder, NodeSelectors, getCoords } from "@downstream/core";
import util from 'node:util';
import { spawn } from 'node:child_process';

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
    ,
    handler: async (ctx) => {
        const maxConnections: number = ctx.maxConnections || 1;

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

        // move unit around randomly
        let [q,r,s] = [0,0,0];
        while (true) {
            const validNeighbours = getNeighbourCoords(q,r,s)
                .filter((nc) => validCoords.some((vc) => `${nc.q}:${nc.r}:${nc.s}` === `${vc.q}:${vc.r}:${vc.s}`))
                .map(({q,r,s}) => [q,r,s]);
            [q,r,s] = validNeighbours[Math.floor(Math.random() * validNeighbours.length)] || [0,0,0];

            await player.dispatch({ name: 'MOVE_MOBILE_UNIT', args: [unitKey, q, r, s] }).then(res => res.wait());
            // if (Math.random() > 0.75){
            //     const building = Math.random() > 0.5 ? "0xbe92755c0000000000000000546391e80000000000000003" : "0xbe92755c0000000000000000444749c70000000000000003";
            //     const args = { name: 'CONSTRUCT_BUILDING_MOBILE_UNIT', args: [unitId, building, q, r, s] };
            //     await player.dispatchAndWait(args);
            //     // failed to call: execution reverted: no construction bag found
            // }
            await sleep(Math.floor(Math.random() * 2000)); // jitter
        }
    },
};

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

import { pipe, take, toPromise } from 'wonka';
import { CompoundKeyEncoder, NodeSelectors, getCoords } from "@downstream/core";

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
    },
    handler: async (ctx) => {
        const player = await ctx.player();

        const [q, r, s] = CRITTER_SPAWN_LOCATIONS[ctx.spawnPoint];
        // spawn a unit
        const unitKey = BigInt(Math.floor(Math.random() * 100000))
        const unitId = CompoundKeyEncoder.encodeUint160( NodeSelectors.Critter, unitKey);
        await player.dispatchAndWait({ name: 'SPAWN_CRITTER', args: [unitId] }, {name: 'MOVE_CRITTER', args: [unitId, q, r, s]});


    },
};

interface CritterState {
    id: string;
    prevCoords: {q: number, r: number, s: number};
    nextCoords: {q: number, r: number, s: number};
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
        const res: any = await pipe(client.query(GET_TILES, { gameID: ctx.game }, {subscribe: false}), take(1), toPromise);
        const validCoords = res.game.state.tiles.map(getCoords);

        // state
        const critters: Map<string, CritterState> = new Map<string, CritterState>;

        // move unit around randomly
        while (true) {
            console.log('\n\n\n');
            console.log('------------------TICK---------------');

            // fetch the critters
            const crittersQuery: any = await pipe(client.query(GET_CRITTERS, { gameID: ctx.game }, {subscribe: false}), take(1), toPromise);

            // update critter state
            crittersQuery.game.state.critters.forEach((critter) => {
                let c: CritterState | undefined = critters.get(critter.id);
                // const prevCoords = getCoords(critter.prevLocation.tile);
                const nextCoords = getCoords(critter.nextLocation.tile);
                if (!c) {
                    c = {
                        id: critter.id,
                        prevCoords: nextCoords,
                        nextCoords,
                        health: 100,
                        target: {q:0,r:0,s:0},
                        mode: 'random',
                        radius: 1,
                    }
                }
                // c.prevCoords = prevCoords;
                c.nextCoords = nextCoords;
                critters.set(critter.id, c);
            });

            const tx: Array<Promise<any>> = [sleep(Math.floor(Math.random() * 1000))];

            for (let [_id, critter] of critters) {
                let {q,r,s} = critter.nextCoords;

                if (critter.mode === 'random') {
                    const validNeighbours = getNeighbourCoords(q,r,s)
                        .filter((nc) => validCoords.some((vc) => `${nc.q}:${nc.r}:${nc.s}` === `${vc.q}:${vc.r}:${vc.s}`))
                        .map(({q,r,s}) => [q,r,s]);
                    [q,r,s] = validNeighbours[Math.floor(Math.random() * validNeighbours.length)] || [0,0,0];
                    let backtrackAvoids = 0;
                    while (backtrackAvoids < 5 && q === critter.prevCoords[0] && r === critter.prevCoords[1] && s === critter.prevCoords[2]) {
                        console.log('avoiding backtrack', backtrackAvoids);
                        [q,r,s] = validNeighbours[Math.floor(Math.random() * validNeighbours.length)] || [0,0,0];
                        backtrackAvoids++;
                    }
                    critter.prevCoords = critter.nextCoords;
                    critter.nextCoords = {q,r,s};

                    console.log('moving critter randomly', critter.id, q, r, s);
                    tx.push(
                        player.dispatch(
                            { name: 'MOVE_CRITTER', args: [critter.id, q, r, s] }
                        ).then(res => res.wait())
                    );
                }
            };
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

const GET_TILES = `query GetTiles($gameID: ID!) {
    game(id: $gameID) {
        state(simulated: true) {
            tiles: nodes(match: { kinds: ["Tile"] }) {
                coords: keys
            }
        }
    }
}`;

const GET_CRITTERS = `
fragment Location on Edge {
    id
    tile: node {
        id
        coords: keys
    }
}
query GetCritters($gameID: ID!) {
    game(id: $gameID) {
        state(simulated: true) {
            critters: nodes(match: { kinds: ["Critter"] }) {
                id
                prevLocation: edge(match: { kinds: "Tile", via: { rel: "Location", key: 0 } }) {
                    ...Location
                }
                nextLocation: edge(match: { kinds: "Tile", via: { rel: "Location", key: 1 } }) {
                    ...Location
                }
            }
        }
    }
}
`;

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

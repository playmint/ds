import { ethers } from 'ethers';
import { pipe, take, toPromise } from 'wonka';
import { CogAction, CompoundKeyEncoder, ConnectedPlayer, NodeSelectors, getCoords } from '@downstream/core';
import util from 'node:util';
import { spawn } from 'node:child_process';
import { getZone } from './get';
import { FacingDirectionKind } from '@downstream/core';

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
            .option('zone', {
                alias: 'z',
                demandOption: true,
                describe: 'id of the zone to act in',
                type: 'string',
            })
            .option('offset', {
                describe: 'offset virtual player id',
                type: 'number',
            }),
    handler: async (ctx) => {
        const maxConnections: number = ctx.maxConnections || 1;
        const buildings = ctx.buildings ? ctx.buildings : undefined;
        const offset = ctx.offset ?? 0; // used so you can run two test by offsetting the player keys

        // for each wallet spawn a process with a chaos beaver
        const procs: ReturnType<typeof spawnAsync>[] = [];
        for (let i = 0; i < maxConnections; i++) {
            const key = TEST_PLAYER_KEYS[i + offset];
            console.log(`starting chaos-unit for ${key}`);
            const args = [
                '-n', `${ctx.network || 'local'}`,
                '-z', `${ctx.zone}`,
                `-k`, `${key}`,
                `test`, `chaos-unit`,
            ];
            if (buildings) {
                args.push(`-b`, `${buildings}`);
            }
            procs.push(spawnAsync('ds', args, { stdio: ['ignore', process.stdout, process.stderr] }));
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
        .option('zone', {
            alias: 'z',
            demandOption: true,
            describe: 'id of the zone to act in',
            type: 'string',
        }),
    handler: async (ctx) => {
        const client = await ctx.client();
        const player = await ctx.player();

        // fetch zone info
        //
        const zoneID = ethers.solidityPacked(['bytes4', 'uint160'], ['0x86fc4f37', ctx.zone]);
        const data = await getZoneData({ client, zoneID, gameID: "DOWNSTREAM" })

        const settings = data.game.state.gameSettings;
        const block = data.game.state.block;
        const zone = data.game.state.zone;

        // spawn a unit
        await spawnMobileUnit({ player, zone, settings, block, zoneId: ctx.zone });

        // load the tiles

        const validCoords = data.game.state.zone.tiles.map(getCoords);
        const buildings: string[] = ctx.buildings ? ctx.buildings.split(',') : [];

        // move unit around randomly
        let {z, q, r, s} = validCoords[0];
        while (true) {
            const validNeighbours = getNeighbourCoords(z, q, r, s)
                .filter((nc) => validCoords.some((vc) => `${nc.q}:${nc.r}:${nc.s}` === `${vc.q}:${vc.r}:${vc.s}`))
                .map(({ z, q, r, s }) => [z, q, r, s]);
            [z, q, r, s] = validNeighbours[Math.floor(Math.random() * validNeighbours.length)] || [ctx.zone, 0, 0, 0];

            await player.dispatch({ name: 'MOVE_MOBILE_UNIT', args: [z, q, r, s] });
            await sleep(Math.floor(Math.random() * 1000)); // jitter
            // place building
            if (buildings?.length > 0) {
                const selectedBuilding = buildings[Math.floor(Math.random() * buildings.length)];
                const targetTileID = CompoundKeyEncoder.encodeInt16(NodeSelectors.Tile, z, q, r, s);
                const zone = await getZone(ctx);
                const buildingOnTargetTile = getBuildingOnTile(zone.buildings, targetTileID);
                if (typeof buildingOnTargetTile === 'undefined') {
                    await player
                        .dispatch({
                            name: 'DEV_SPAWN_BUILDING',
                            args: [selectedBuilding, z, q, r, s, FacingDirectionKind.RIGHT],
                        })
                        .then((res) => res.wait());
                }
            }
            await sleep(Math.floor(Math.random() * 1000) + 500);
        }
    },
};

const getZoneData = async ({ client, zoneID, gameID }) => {
    const res: any = await pipe(
        client.query(GET_ZONE, { gameID, zoneID }, { subscribe: false }),
        take(1),
        toPromise
    );
    return res;
}

const spawnMobileUnit = async ({ player, zoneId, zone, settings, block }: {
        player: ConnectedPlayer;
        zoneId: number;
        zone: any;
        settings: {
            zoneUnitLimit: {value: string};
            unitTimeoutBlocks: {value: string};
        };
        block: number
    }) => {
    const spawnActions: CogAction[] = [{ name: 'SPAWN_MOBILE_UNIT', args: [] }];
    // We need to kick out 2 units if the owner is pushing the capacity over the limit
    // If we are the owner and there are no inactive units, we can spawn anyway
    const unitTimeoutBlocks = parseInt(settings.unitTimeoutBlocks.value || '0x0', 16);
    const zoneUnitLimit = parseInt(settings.zoneUnitLimit.value || '0x0', 16);
    const inactiveUnits = zone.mobileUnits.filter(
        (u: any) => u.nextLocation && u.nextLocation.time + unitTimeoutBlocks <= block
    );
    const kickCount = Math.min(inactiveUnits.length, zone.mobileUnits.length > zoneUnitLimit ? 2 : 1);
    for (let i = 0; i < kickCount; i++) {
        const inactiveUnit = inactiveUnits[i];
        console.log('kicking inactive unit ' + i, inactiveUnit.id);
        try {
            await player.dispatchAndWait({
                name: 'KICK_UNIT_FROM_ZONE',
                args: [inactiveUnit.id],
            });
        } catch (err: any) {
            console.log(`kickfail, probably already kicked: ${err}`);
        }
    }
    spawnActions.push({ name: 'MOVE_MOBILE_UNIT', args: [zoneId, 0, 0, 0] });
    return player.dispatchAndWait(...spawnActions);
};

function getBuildingOnTile(buildings, tileID) {
    return (buildings || []).find((b) => tileID && b.location?.tile?.id === tileID);
}

export const test = {
    command: 'test',
    describe: 'internal test tooling',
    builder: (yargs) => yargs.command(chaosUnit).command(concurrency),
};

const GET_ZONE = `
    query GetZone($gameID:ID!, $zoneID: String!) {
        game(id: $gameID) {
            id
            state(simulated: true) {
                id
                block
                ...GlobalState
                zone: node(match: { ids: [$zoneID] }) {
                    id
                    key
                    name: data(name: "name") {
                        value
                    }
                    description: annotation(name: "description") {
                        value
                    }
                    url: annotation(name: "url") {
                        value
                    }
                    allData {
                        name
                        value
                    }
                    isFeatured: edge(match: { via: { rel: "IsFeatured", key: 0 } }) {
                        value: weight
                    }
                    owner: node(match: { via: { rel: "Owner" } }) {
                        id
                        addr: key
                    }
                    buildings: nodes(match: { kinds: "Building", via: { rel: "Parent", dir: IN } }) {
                        ...WorldBuilding
                    }
                    mobileUnits: nodes(match: { kinds: "MobileUnit", via: { rel: "Parent", dir: IN } }) {
                        ...WorldMobileUnit
                    }
                    sessions: nodes(match: { kinds: "CombatSession", via: { rel: "Parent", dir: IN } }) {
                        ...WorldCombatSession
                    }
                    tiles: nodes(match: { kinds: "Tile", via: { rel: "Parent", dir: IN } }) {
                        ...WorldTile
                    }
                    autoquests: nodes(match: { kinds: "Quest", via: { rel: "Parent", dir: IN } }) {
                        id
                        name: annotation(name: "name") {
                            value
                        }
                    }
                }
            }
        }
    }
    fragment Item on Node {
        id
        name: annotation(name: "name") {
            id
            value
        }
        icon: annotation(name: "icon") {
            id
            value
        }
    }

    fragment ItemSlot on Edge {
        key
        balance: weight
        item: node {
            ...Item
        }
    }

    fragment Bag on Node {
        id
        key
        slots: edges(match: { kinds: ["Item"], via: { rel: "Balance" } }) {
            ...ItemSlot
        }
        owner: node(match: { via: { rel: "Owner" } }) {
            id
        }
        equipee: edge(match: { via: { rel: "Equip", dir: IN } }) {
            key
            node {
                id
            }
        }
    }

    fragment Location on Edge {
        id
        key # 0=LAST_LOCATION, 1=DEST_LOCATION
        time: weight # block at which location is valid
        tile: node {
            id
            coords: keys
            # building: node(match: { kinds: "Building", via: { rel: "Location", dir: IN } }) {
            #     id
            # }
            # atoms: edges(match: { kinds: ["atom"], via: { rel: "balance" } }) {
            #     key
            #     weight
            # }
        }
    }

    fragment WorldMobileUnit on Node {
        id
        key
        # there are always two location edges
        # the "departure" is the edge with key=0
        #     this points to the last known tile position recorded
        #     the weight of the departure edge is the block time of the last move
        prevLocation: edge(match: { kinds: "Tile", via: { rel: "Location", key: 0 } }) {
            ...Location
        }
        # the "destination" is the edge with key=1
        #     this points to the where the mobileUnit is heading.
        #     the weight of the destination edge is the time of arrival
        #     if the current block time >= arrival time then this is the CURRENT LOCATION
        #     but if not, you need to use the departure edge time to work out where we are
        nextLocation: edge(match: { kinds: "Tile", via: { rel: "Location", key: 1 } }) {
            ...Location
        }
        # who owns this mobileUnit
        owner: node(match: { kinds: "Player", via: { rel: "Owner" } }) {
            ...WorldPlayer
        }
        # owner assigned name
        name: data(name: "name") {
            value
        }
        # equipment
        bags: nodes(match: { kinds: "Bag", via: { rel: "Equip", dir: OUT } }) {
            ...Bag
        }
    }

    fragment BuildingKind on Node {
        id
        name: annotation(name: "name") {
            value
        }
        description: annotation(name: "description") {
            value
        }
        model: annotation(name: "model") {
            value
        }
        # materials are the construction costs to build
        materials: edges(match: { kinds: ["Item"], via: { rel: "Material" } }) {
            ...ItemSlot
        }
        # inputs (if set) are the registered crafting inputs
        inputs: edges(match: { kinds: ["Item"], via: { rel: "Input" } }) {
            ...ItemSlot
        }
        # outputs (if set) are the registered crafting outputs
        outputs: edges(match: { kinds: ["Item"], via: { rel: "Output" } }) {
            ...ItemSlot
        }
        # who deployed this building kind
        owner: node(match: { kinds: "Player", via: { rel: "Owner" } }) {
            id
            addr: key
        }
        # implementation of this building kind
        implementation: node(match: { kinds: "Extension" }) {
            id
        }
    }
    fragment WorldBuilding on Node {
        id
        kind: node(match: { kinds: "BuildingKind", via: { rel: "Is" } }) {
            ...BuildingKind
        }
        owner: node(match: { kinds: "Player", via: { rel: "Owner" } }) {
            id
            addr: key
        }
        timestamp: edge(match: { kinds: ["BlockNum"], via: { rel: "HasBlockNum", key: 1 } }) {
            blockNum: weight
        }
        gooReservoir: edges(match: { kinds: ["Atom"], via: { rel: "Balance" } }) {
            key
            weight
        }
        location: edge(match: { kinds: "Tile", via: { rel: "Location", key: 2 } }) {
            ...Location
        }
        constructionBlockNum: edge(match: { via: { rel: "HasBlockNum", key: 0 } }) {
            value: weight
        }
        allData {
            name
            value
        }
        bags: nodes(match: { kinds: "Bag", via: { rel: "Equip", dir: OUT } }) {
            ...Bag
        }
        facingDirection: value(match: { via: { rel: "FacingDirection" } }) # 0=RIGHT, 1=LEFT
    }

    fragment WorldCombatSession on Node {
        id
        attackTile: edge(match: { kinds: "Tile", via: { rel: "Has", key: 0 } }) {
            startBlock: weight
            tile: node {
                id
            }
        }
        defenceTile: edge(match: { kinds: "Tile", via: { rel: "Has", key: 1 } }) {
            startBlock: weight
            tile: node {
                id
            }
        }
        sessionUpdates: annotations {
            name
            value
        }
        isFinalised: edge(match: { kinds: "CombatSession", via: { rel: "IsFinalised" } }) {
            flag: weight
        }
        attackers: edges(match: { via: { rel: "CombatAttacker" } }) {
            node {
                id
            }
        }
        defenders: edges(match: { via: { rel: "CombatDefender" } }) {
            node {
                id
            }
        }
        bags: nodes(match: { kinds: "Bag", via: { rel: "Equip", dir: OUT } }) {
            ...Bag
        }
    }
    fragment WorldPlayer on Node {
        id
        addr: key
    }
    fragment WorldTile on Node {
        id
        # the keys break down the coords
        # there are 4 parts:
        #     coords[0] is zone and always 0 for now
        #     coords[1] is q
        #     coords[2] is r
        #     coords[3] is s
        coords: keys
        # tiles are either DISCOVERED or UNDISCOVERED
        # this is recorded on the biome edge weight for now
        # but this is temporary until we know what we need
        biome: value(match: { via: { rel: "Biome" } }) # 0=UNDISCOVERED, 1=DISCOVERED
        atoms: edges(match: { kinds: ["atom"], via: { rel: "balance" } }) {
            key
            weight
        }
        bags: nodes(match: { kinds: "Bag", via: { rel: "Equip", dir: OUT } }) {
            ...Bag
        }
    }
    fragment GlobalState on State {
        block
        gameSettings: node(match: { kinds: ["GameSettings"] }) {
            zoneUnitLimit: data(name: "zoneUnitLimit") {
                value
            }
            unitTimeoutBlocks: data(name: "unitTimeoutBlocks") {
                value
            }
        }
        items: nodes(match: { kinds: "Item" }) {
            id
        }
        buildingKinds: nodes(match: { kinds: "BuildingKind" }) {
            id
        }
    }
`;

function getNeighbourCoords(z, q, r, s) {
    return [
        { z: z, q: q + 1, r: r, s: s - 1 },
        { z: z, q: q + 1, r: r - 1, s: s },
        { z: z, q: q, r: r - 1, s: s + 1 },
        { z: z, q: q - 1, r: r, s: s + 1 },
        { z: z, q: q - 1, r: r + 1, s: s },
        { z: z, q: q, r: r + 1, s: s - 1 },
    ];
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

const TEST_PLAYER_KEYS = [
    '0x2d4665cccedfc7a30a6116b1de298d65c54a93001f738a3eb6800f593ef1940a',
    '0x2b2368d275c4e6f99cb58211fa6b19a9596e4717b00e496d26334043ebb24bcd',
    '0x630fe1e0ad0b80f631b62c1ace31cec450e45daffc5caf14d25d75139f0fd820',
    '0x824f55813bffc16208baeb2901ab987d56308f21b2d0c80e6cf781ea8fad9d4a',
    '0xac0a1106fb8bfcae2c12fb4cefab09e5c0e5198e46a5c450460296f50b5678fd',
    '0xc7a42cba2914b2e5768903ffcca730de8b7bc49afc6ee62cbc6a0ebbd7efff75',
    '0x7cbb4830dd4bd18afd0ffa64b62f90e4dbef3ac3c9e045964462f4f9c1fad340',
    '0x7d87ed108534b11367fd22bafd8e3123bd8c58fa18387e83a8649c08f517a255',
    '0xfac396a6b93ff02dd885b5e916c150e088b2c3f1b326bc81e0f5556ccfb2fe3f',
    '0xbafcad38d7657ea72b303f7523e5d8264df8f54da21b6b3d56ee7f494261a0da',
    '0x8aa484a680754639e4ab29d2f6f09cc109e9dd1424d79e15b8ac62c6c17cceb6',
    '0x47025662b3ae95267ace8c498c21b61b4b50ecf78b5a613d6bfa414975ed05c4',
    '0x57267021bda8dce7b274c92d500def94d40b994ee3abc886becff27510836c22',
    '0x2c2e8cbb7d0bcd3c5b637b1defd55b4b750c5cd9374ebe2e86c2ca9d4164cfa1',
    '0xd8a8ae60ea8962252cc6194871d2d5cda9db468b91a2872bb6bdc9f25344ccf6',
    '0xb08e9e5f264891fbe94e830da6f7c152f50be631ead2ffd953b5300ef9cf5f8a',
    '0x3c9cd55bbf7e7d686188633e5594257aed09f335cd7ee1268054b2a10dc30423',
    '0xe640a7c7ca2b22be01cbfbc184f35207caa0bbaa6322f39c0fc56d7498f41726',
    '0xb0bc6a044180622a4ac89a8df1388ac210446e0b127eefdb52f01faa209bd6b8',
    '0xbd006b69032d7e5961ef952503d3f1e21ff3913e64803cf0cd5f7d561a300d34',
    '0xc5d8485120c916cf4e1efb10bd29dd0929c9e8a40340bc4cfca3640f9e6835b1',
    '0x74bceddeea1b53113d2825db66a64fff0c1dc7ff4cbe6958034fd4c2014e9e6b',
    '0xdb50a3eba49df222537f6a798f662a4569f1f3c1d0b025d423ef102385330f51',
    '0x9e0abdf6a08afa16e1335ceb962c59f58bf10db947514684d315e33ac5f7bdf5',
    '0x458d5d1758129e4d7c94e9197871e18b4a149662d962e2f8a2d2a1affa63a170',
    '0x390de337bd5aab885f959db7dc0401aad61aab894d9b567a25d60eeff9936fe9',
    '0xc8052e4b48e3b52ed36f962af24ed890ede0305900fe94429eced3882a105a50',
    '0xc3cb291e126791a666b4b6d70d12a7ed0782be0dab99d813bec11f1eba34e62f',
    '0x1b83a70f0f4453c80eb961041a22c16fb5d834a1d498516ddfb303f2f44fbe55',
    '0xeb31c93eaa06fe202a5717617a949c84c32b58c892085a2055e1dce9aeb07497',
    '0x1075ff45821b94231400eba909aaaeec46699e52161e88024e338119f3319a8b',
    '0xe0b4fb5378207206288c23527c9ab488516f17fce76f20942a92ccdaf4ab6f47',
    '0x7ad16b906dc3089274763a10fa0574da9e5b04d3da7ae1370ebb0e50d633a2ff',
    '0x0ee50433145af482ba24ed08be67d595cff7309300f9a72869f068d249f10a1c',
    '0x7e5e1de863b1f9aafd4c2aee70c52e364c64ba8c706b8c557d0bc6403bc99f9a',
    '0x50d82c3a4b5ba5cc902cd4c16b593da99540fc93b66a85687d8ec08d163bda4e',
    '0x467ed524f6f3f31fd771db9dc044fd9cfffc8e1400a78f37274ef4ce6c121a1b',
    '0xbd4766dd66f7f949773bd1b268a209a9066165dfcaf4a3750686be20db65de2b',
    '0xabef053908ab01dc97bc5d3aee9ea888d673e1f7c2c14b8a2d6226697d1ebcde',
    '0x830ec6049e6b38de334500c2715812e78676e7328ba23978d0964e094e9b6a87',
    '0x5433b37b01b04fdc5c91a621868fcde896f671e8560d6d820028b6bcb1d1eb33',
    '0x96213f7946767ff1265b829f6dc8098a41856330ead26996eae21893eb55824a',
    '0x0625d4ed940b47dda290c055921dd7f259046269f11de53a34cbab098db20bd7',
    '0x75a90d1e80b9312beab68d633f379cc3954838ea25ca97f98d957d70ea62fd5d',
    '0x2b7602048b48edf7af933d0d3386a80ffe566da0d9db4b00cfaa650aa18315de',
    '0x49a4de685eb9f228c7b33d1bdd58ca9326a21a9b1b747aaa0332558a9ced0af8',
    '0x9ecd29b84181ec73104a0f81817adcb47cbcb943aae896be9776238cef29a4c5',
    '0xaa0692751501d4f0dc0e1822b4b1f2166ec7be65a930c27a6275555eb995f6b4',
    '0x00ff0a6d48d155cd5bd588a8320c2e8f573faa0d8adb88a8f20f3e57dd9b836d',
    '0x07ec7412a1b41b0c18206f5053f16413a9521fa48968507d4139f7e64767a0f1',
];

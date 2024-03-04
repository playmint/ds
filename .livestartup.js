const concurrently = require('concurrently');
const path = require('path');
const fs = require('fs');
const { execSync } = require("child_process");

// ------------------------------------------------------------------
// this is a startup script for running a local build of downstream
// ------------------------------------------------------------------
//

const SEQUENCER_PRIVATE_KEY = process.env.SEQUENCER_PRIVATE_KEY;
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const NETWORK_ENDPOINT_HTTP = "https://rpc.holesky.redstone.xyz";
const NETWORK_ENDPOINT_WS = "wss://rpc.holesky.redstone.xyz/ws";

async function handleStartup(){
    const addrs = JSON.parse(fs.readFileSync(`redstone.json`).toString());

    // configure services to run
    const commands = [
        {
            name: 'services',
            command: `./bin/ds-node`,
            env: {
                PORT: "8181",
                CHAIN_ID: "17001",
                SEQUENCER_PRIVATE_KEY,
                SEQUENCER_PROVIDER_URL_HTTP: NETWORK_ENDPOINT_HTTP,
                SEQUENCER_PROVIDER_URL_WS: NETWORK_ENDPOINT_WS,
                SEQUENCER_MINE_EMPTY: "false",
                INDEXER_WATCH_PENDING: "false",
                INDEXER_PROVIDER_URL_HTTP: NETWORK_ENDPOINT_HTTP,
                INDEXER_PROVIDER_URL_WS: NETWORK_ENDPOINT_WS,
                INDEXER_GAME_ADDRESS: addrs.game,
                INDEXER_STATE_ADDRESS: addrs.state,
                INDEXER_ROUTER_ADDRESS: addrs.router,
                INDEXER_MAX_LOG_RANGE: "50000",
            },
            prefixColor: 'yellow',
            cwd: path.resolve(__dirname, path.join('contracts', 'lib', 'cog', 'services')),
        },

        {
            name: ' client ',
            command: 'npm run dev --workspace=frontend -- -p 3000',
            prefixColor: 'blueBright',
        },

        {
            name: '  core  ',
            command: 'npm run build:watch --workspace=core',
            prefixColor: 'blueBright',
        },

    ];

    // run everything concurrently. if one exits, they all exit.
    const processes = concurrently(commands, {
        prefix: 'name',
        prefixColors: 'auto',
        killOthers: ['failure', 'success'],
        restartTries: 1,
    });

    processes.result
        .then(() => console.log('shutdown'))
        .catch(() => console.error('stopped'));
}

handleStartup();

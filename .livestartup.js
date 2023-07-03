const concurrently = require('concurrently');
const path = require('path');
const { execSync } = require("child_process");

// ------------------------------------------------------------------
// this is a startup script for running a local build against ds-test data
// ------------------------------------------------------------------
//
const SEQUENCER_PRIVATE_KEY = "84aaa8f2ba6c827c444f6e3b61113a67a76a119d821a4fe21264889fb6e25617"
const DEPLOYER_PRIVATE_KEY = "0x6335c92c05660f35b36148bbfb2105a68dd40275ebf16eff9524d487fb5d57a8";

// configure services to run

const commands = [
    {
        name: 'sim',
        command: "anvil --code-size-limit 9999999999999 --gas-limit 9999999999999999 --port 8546 --fork-url https://network-ds-test.dev.playmint.com --no-mining --no-rate-limit --no-storage-caching --silent",
        prefixColor: 'black',
    },

    {
        name: 'services',
        command: './bin/wait-for -it localhost:8546 -t 300 && ./bin/ds-node',
        env: {
            PORT: "8181",
            CHAIN_ID: "1337",
            SEQUENCER_PRIVATE_KEY,
            SEQUENCER_PROVIDER_URL_HTTP: "https://network-ds-test.dev.playmint.com",
            SEQUENCER_PROVIDER_URL_WS: "wss://network-ds-test.dev.playmint.com",
            SIMULATION_PROVIDER_URL_HTTP: "http://localhost:8546",
            SIMULATION_PROVIDER_URL_WS: "ws://localhost:8546",
            INDEXER_WATCH_PENDING: "false",
            INDEXER_PROVIDER_URL_HTTP: "https://network-ds-test.dev.playmint.com",
            INDEXER_PROVIDER_URL_WS: "wss://network-ds-test.dev.playmint.com",
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



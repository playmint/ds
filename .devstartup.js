const concurrently = require('concurrently');
const path = require('path');
const { execSync } = require("child_process");

// ------------------------------------------------------------------
// this is a startup script for running a local build of downstream
// ------------------------------------------------------------------
//

// key with cash on playmint-testnet
const SEQUENCER_PRIVATE_KEY = "";

// configure services to run

const commands = [
    // don't need an anvil
    //{
    //    name: 'networks',
    //    command: "anvil -m 'thunder road vendor cradle rigid subway isolate ridge feel illegal whale lens' --code-size-limit 9999999999999 --gas-limit 9999999999999999 --silent",
    //    prefixColor: 'black',
    //},

    // need to fork sim from playmint
    {
        name: 'sim',
        command: "anvil --code-size-limit 9999999999999 --gas-limit 9999999999999999 --port 8546 --fork-url https://playmint-testnet.calderachain.xyz/http --no-mining --no-rate-limit --no-storage-caching --silent",
        prefixColor: 'black',
    },

    // contracts have been deployed manually now - wait for commnand doesn't work
    //{
    //    name: 'contract',
    //    command: './lib/cog/services/bin/wait-for -it https://playmint-testnet.calderachain.xyz/http -t 300 && forge script script/Deploy.sol:GameDeployer --broadcast --slow --rpc-url "https://playmint-testnet.calderachain.xyz/http" && sleep 9999999',
    //    prefixColor: 'black',
    //    env: {
    //        DEPLOYER_PRIVATE_KEY,
    //    },
    //    cwd: path.resolve(__dirname, path.join('contracts')),
    //},

    // services need to poitn to playmint-testnet
    // wait for commnand doesn't work
    {
        name: 'services',
        command: /*'./bin/wait-for -it https://playmint-testnet.calderachain.xyz/http -t 300 && */'./bin/wait-for -it localhost:8546 -t 60 && ./bin/ds-node',
        env: {
            PORT: "8181",
            CHAIN_ID: "14829",
            SEQUENCER_PRIVATE_KEY,
            SEQUENCER_PROVIDER_URL_HTTP: "https://playmint-testnet.calderachain.xyz/http",
            SEQUENCER_PROVIDER_URL_WS: "wss://playmint-testnet.calderachain.xyz/ws",
            SIMULATION_PROVIDER_URL_HTTP: "http://localhost:8546",
            SIMULATION_PROVIDER_URL_WS: "ws://localhost:8546",
            INDEXER_WATCH_PENDING: "false",
            INDEXER_PROVIDER_URL_HTTP: "https://playmint-testnet.calderachain.xyz/http",
            INDEXER_PROVIDER_URL_WS: "wss://playmint-testnet.calderachain.xyz/ws",
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



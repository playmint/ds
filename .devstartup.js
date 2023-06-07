const concurrently = require('concurrently');
const path = require('path');
const { execSync } = require("child_process");

// ------------------------------------------------------------------
// this is a startup script for running a local build of dawnseekers
// ------------------------------------------------------------------
//

const SEQUENCER_PRIVATE_KEY = "095a37ef5b5d87db7fe50551725cb64804c8c554868d3d729c0dd17f0e664c87";
const DEPLOYER_PRIVATE_KEY = "0x6335c92c05660f35b36148bbfb2105a68dd40275ebf16eff9524d487fb5d57a8";

// configure services to run

const commands = [
    {
        name: 'networks',
        command: "anvil -m 'thunder road vendor cradle rigid subway isolate ridge feel illegal whale lens' --code-size-limit 9999999999999 --gas-limit 9999999999999999 --silent --block-time 2",
        prefixColor: 'black',
    },

    {
        name: 'contract',
        command: './lib/cog/services/bin/wait-for -it localhost:8545 -t 300 && forge script script/Deploy.sol:GameDeployer --broadcast --rpc-url "http://localhost:8545" && sleep 9999999',
        prefixColor: 'black',
        env: {
            DEPLOYER_PRIVATE_KEY,
        },
        cwd: path.resolve(__dirname, path.join('contracts')),
    },

    {
        name: 'services',
        command: './bin/wait-for -it localhost:8545 -t 300 && ./bin/ds-node -debug',
        env: {
            PORT: "8181",
            CHAIN_ID: "1337",
            SEQUENCER_PRIVATE_KEY,
            SEQUENCER_PROVIDER_URL_HTTP: "http://localhost:8545",
            SEQUENCER_PROVIDER_URL_WS: "ws://localhost:8545",
            INDEXER_WATCH_PENDING: "false",
            INDEXER_PROVIDER_URL_HTTP: "http://localhost:8545",
            INDEXER_PROVIDER_URL_WS: "ws://localhost:8545",
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



const concurrently = require('concurrently');
const path = require('path');
const fs = require('fs');
const { execSync } = require("child_process");

// ------------------------------------------------------------------
// this is a startup script for running a local build of downstream
// ------------------------------------------------------------------
//

const SEQUENCER_PRIVATE_KEY = "095a37ef5b5d87db7fe50551725cb64804c8c554868d3d729c0dd17f0e664c87";
const DEPLOYER_PRIVATE_KEY = "0x6335c92c05660f35b36148bbfb2105a68dd40275ebf16eff9524d487fb5d57a8";
const MAP = process.env.MAP || "default";

async function handleStartup(){
    // bail if MAP=tonk
    if (MAP === 'tonk') {
        console.error('');
        console.error('MAP=tonk is not supported via `make dev`');
        console.error('');
        console.error('Either use: `MAP=tonk docker compose --profile tonk up`');
        console.error('');
        console.error('Or use MAP=default and then work out how to build and run tonk services manually (requires rust toolchain)');
        console.error('');
        process.exit(1);
    }
    // which map to deploy (relative to contracts)
    const mapPath = path.join('./src/maps/', MAP);
    if (!fs.existsSync(path.join('contracts', mapPath))) {
        console.error('');
        console.error(`ERROR: no map dir for '${MAP}' found`);
        console.error('');
        if (MAP === 'performance-test') {
            console.error('hint: maybe you forgot to generate the performance-test map?');
            console.error('');
            console.error(`      NUM_ARENAS=3 make contracts/src/maps/performance-test`);
            console.error('');
        }
        process.exit(1);
    }
    // configure services to run
    const commands = [
        {
            name: 'networks',
            command: "anvil -m 'thunder road vendor cradle rigid subway isolate ridge feel illegal whale lens' --block-time 2 --block-base-fee-per-gas 1 --transaction-block-keeper 250",
            prefixColor: 'black',
        },

        {
            name: 'contract',
            command: `./lib/cog/services/bin/wait-for -it localhost:8545 -t 300 \
                && sleep 3 \
                && forge script script/Deploy.sol:GameDeployer --broadcast --rpc-url "http://localhost:8545" \
                && ./lib/cog/services/bin/wait-for -it localhost:8080 -t 300 \
                && sleep 2 \
                && ds -k ${DEPLOYER_PRIVATE_KEY} -n local apply -R -f ${mapPath} --max-connections 500 \
                && ds -k ${DEPLOYER_PRIVATE_KEY} -n local apply -R -f ./src/example-plugins/ --max-connections 500 \
                && sleep 9999999`,
            prefixColor: 'black',
            env: {
                DEPLOYER_PRIVATE_KEY,
            },
            cwd: path.resolve(__dirname, path.join('contracts')),
        },

        {
            name: 'services',
            command: './bin/wait-for -it localhost:8545 -t 300 && ./bin/ds-node',
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
}

handleStartup();

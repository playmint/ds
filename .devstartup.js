const concurrently = require('concurrently');
const path = require('path');
const { execSync } = require("child_process");

// ------------------------------------------------------------------
// this is a startup script for running a local build of downstream
// ------------------------------------------------------------------
//

const SEQUENCER_PRIVATE_KEY = "095a37ef5b5d87db7fe50551725cb64804c8c554868d3d729c0dd17f0e664c87";
const DEPLOYER_PRIVATE_KEY = "0x6335c92c05660f35b36148bbfb2105a68dd40275ebf16eff9524d487fb5d57a8";

let MAP_VAR = (process.argv[2] || "../maps/default").toLowerCase();
// if undefined default to 1, value is capped at 25
const ARENAS_VAR = Math.min(Number(process.argv[3] || 1), 25);

async function handleStartup(){
    // specific startup processes
    if (MAP_VAR === "performance-test"){
        const performanceTestFile = require('./scripts/performance-test.js');
        result = await performanceTestFile.buildPerformanceTest(ARENAS_VAR);
        MAP_VAR = result.MapName;
        if (result.error){
            return console.log("There was an error building the performance test: ", result.error);
        }
        if (ARENAS_VAR === 0){
            return console.log("test-plugins folder deleted");
        }
    }

    // configure services to run

    const commands = [
        {
            name: 'networks',
            command: "anvil -m 'thunder road vendor cradle rigid subway isolate ridge feel illegal whale lens' --block-time 2 --block-base-fee-per-gas 1 --transaction-block-keeper 25 --prune-history",
            prefixColor: 'black',
        },

        {
            name: 'contract',
            command: `./lib/cog/services/bin/wait-for -it localhost:8545 -t 300 \
                && forge script script/Deploy.sol:GameDeployer --broadcast --rpc-url "http://localhost:8545" \
                && ./lib/cog/services/bin/wait-for -it localhost:8080 -t 300 \
                && sleep 2 \
                && ds -k ${DEPLOYER_PRIVATE_KEY} -n local apply -R -f ./src/maps/${MAP_VAR}/ --max-connections 500 \
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
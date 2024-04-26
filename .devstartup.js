const concurrently = require('concurrently');
const path = require('path');
const fs = require('fs');
const util = require('node:util');
const exec = util.promisify(require('node:child_process').exec);

// ------------------------------------------------------------------
// this is a startup script for running a local build of downstream
// ------------------------------------------------------------------

const config = {
    CHAIN_ID: "22300",
    DEPLOYER_PRIVATE_KEY: "0x6335c92c05660f35b36148bbfb2105a68dd40275ebf16eff9524d487fb5d57a8",
    INDEXER_LOG_LEVEL: process.env.INDEXER_LOG_LEVEL || "info",
    INDEXER_TELEMETRY_ENABLE: "false",
    INDEXER_PROVIDER_URL_HTTP: "http://localhost:8545",
    SEQUENCER_PROVIDER_URL_HTTP: "http://localhost:8545",
    SEQUENCER_PRIVATE_KEY: "095a37ef5b5d87db7fe50551725cb64804c8c554868d3d729c0dd17f0e664c87,8451fe83595a88521cac265c1356568ab84c2b5d81654f36ea309be28ded5a0d,c23d69dca6cf8207c53e350cf1ce19807c0a4aee4bee0417fdae8bb0341f482e",
    SEQUENCER_BLOCK_GAS_LIMIT: "100000000", // redstone limit
    SEQUENCER_BATCH_TIME_TARGET: "250",
    SEQUENCER_BATCH_GAS_TARGET: "10000000",
    SEQUENCER_BATCH_GAS_AVERAGE: "500000",
    SEQUENCER_LOG_LEVEL: process.env.SEQUENCER_LOG_LEVEL || "info",
};

async function main() {
    // config
    const dirs = {
        contracts: path.resolve(__dirname, path.join('contracts')),
    };

    // start anvil
    const { result: anvil } = concurrently([
        {
            name: 'networks',
            command: `anvil --silent --gas-limit ${config.SEQUENCER_BLOCK_GAS_LIMIT} --chain-id ${config.CHAIN_ID} -m 'thunder road vendor cradle rigid subway isolate ridge feel illegal whale lens' --block-time 2 --block-base-fee-per-gas 1 --transaction-block-keeper 250`,
            prefixColor: 'black',
        },
    ], {
        prefix: 'name',
        prefixColors: 'auto',
        killOthers: ['failure', 'success'],
        restartTries: 1,
    });

    // wait for anvil
    console.log('waiting for anvil...');
    await exec(`./lib/cog/services/bin/wait-for -it localhost:8545 -t 300`, {
        cwd: dirs.contracts,
    });
    console.log('ok');

    // forge build/install the contracts
    console.log('deploying contracts...')
    const deployment = await exec(`forge script script/Deploy.sol:GameDeployer --broadcast --rpc-url ${config.SEQUENCER_PROVIDER_URL_HTTP} --private-key ${config.DEPLOYER_PRIVATE_KEY}`, {
        cwd: dirs.contracts,
    });
    const contracts = JSON.parse(fs.readFileSync('./contracts/out/latest.json'));
    console.log('ok', contracts);

    // configure services to run using the contracts we just deployed
    const { result: services } = concurrently([
        {
            name: 'services',
            command: './bin/ds-node',
            env: {
                ...config,
                PORT: "8181",
                INDEXER_GAME_ADDRESS: contracts.game,
                INDEXER_STATE_ADDRESS: contracts.state,
                INDEXER_ROUTER_ADDRESS: contracts.router,
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

    ], {
        prefix: 'name',
        prefixColors: 'auto',
        killOthers: ['failure', 'success'],
        restartTries: 1,
    });

    // wait unless something exits
    await Promise.race([anvil, services]);
}

main()
    .then(() => console.log('shutdown'))
    .catch((err) => console.error('stopped', err));

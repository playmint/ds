const concurrently = require('concurrently');
const chokidar = require('chokidar');
const path = require('path');
const { exec } = require("child_process");
const { JsonRpcProvider } = require('ethers/providers');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// ------------------------------------------------------------------
// this is a startup script for running a local build of dawnseekers
// ------------------------------------------------------------------

// configure services to run

const commands = [

    {
        name: ' client ',
        command: 'npm run dev --workspace=frontend',
        prefixColor: 'blueBright',
    },

    {
        name: 'services',
        command: 'ds-node -debug',
        env: {
            PORT: "8181",
            CHAIN_ID: "1337",
            SEQUENCER_PRIVATE_KEY: "095a37ef5b5d87db7fe50551725cb64804c8c554868d3d729c0dd17f0e664c87",
            SEQUENCER_PROVIDER_URL_HTTP: "http://localhost:8545",
            SEQUENCER_PROVIDER_URL_WS: "ws://localhost:8545",
            INDEXER_WATCH_PENDING: "false",
            INDEXER_PROVIDER_URL_HTTP: "http://localhost:8545",
            INDEXER_PROVIDER_URL_WS: "ws://localhost:8545",
        },
        prefixColor: 'yellow',
        cwd: path.resolve(__dirname, path.join('contracts', 'lib', 'cog', 'services', 'bin')),
    },

    {
        name: 'networks',
        command: "anvil -m 'thunder road vendor cradle rigid subway isolate ridge feel illegal whale lens' --code-size-limit 9999999999999 --gas-limit 9999999999999999 -b 1",
        prefixColor: 'black',
    },

];

// run everything concurrently. if one exits, they all exit.
const processes = concurrently(commands, {
    prefix: 'name',
    prefixColors: 'auto',
    killOthers: ['failure', 'success'],
    restartTries: 1,
});

// func to tell everything to shutdown
const isAlreadyShuttingDown = false;
const shutdown = (err) => {
    if (isAlreadyShuttingDown) {
        return;
    }
    processes.commands.forEach((cmd) => cmd.kill());
    if (err) {
        console.error(`shutdown reason: ${err}`);
    }
}

// ------------------------------------------------------------------
// run the contract deploy script when network ready or on file changes
// ------------------------------------------------------------------

const deploy = () => {
    console.log('[contracts] deploying contracts');
    exec("forge build", {cwd: path.resolve(path.join(__dirname, 'contracts'))}, (error, stdout, stderr) => {
        if (error) {
            console.log(`[contracts] ${error.message}`);
            return;
        }
        if (stderr) {
            console.log(`[contracts] ${stderr}`);
            return;
        }
        console.log(`[contracts] ${stdout}`);
    });
};

async function deployer() {
    // wait for chain to become available
    const provider = new JsonRpcProvider('http://localhost:8545');
    let ready = false;
    while (!ready) {
        console.log('[contracts] waiting for network...');
        await sleep(500);
        ready = await provider.send('eth_blockNumber');
    }
    // watch for changes to the contracts to trigger contract deployments
    const watcher = chokidar.watch(['contracts/src'], {
        persistent: true
    });
    watcher
        .on('add', deploy)
        .on('change', deploy)
        .on('unlink', deploy)
        .on('error', error => console.error(`Watcher error: ${error}`));
    return watcher;
}
const watcher = deployer()
    .catch((err) => shutdown(err))
    .then(() => console.log('[contracts] watching'));

processes.result
    .then(() => console.log('shutdown'))
    .catch(() => console.error('stopped'))
    .finally(() => process.exit());



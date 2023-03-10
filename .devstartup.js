const concurrently = require('concurrently');
const chokidar = require('chokidar');
const path = require('path');
const { execSync } = require("child_process");
const { JsonRpcProvider } = require('ethers/providers');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

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
        command: "anvil -m 'thunder road vendor cradle rigid subway isolate ridge feel illegal whale lens' --code-size-limit 9999999999999 --gas-limit 9999999999999999",
        prefixColor: 'black',
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
        name: '   sdk  ',
        command: 'npm run watch --workspace=sdk',
        prefixColor: 'magenta',
    },

];

// run everything concurrently. if one exits, they all exit.
const processes = concurrently(commands, {
    prefix: 'name',
    prefixColors: 'auto',
    killOthers: ['failure', 'success'],
    restartTries: 0,
});

// func to tell everything to shutdown
const isShutdown = false;
const shutdown = (err) => {
    if (isShutdown) {
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

const debounce = (callback, wait) => {
    let timeoutId = null;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            callback.apply(null, args);
        }, wait);
    };
}

const deploy = debounce(() => {
    console.log('[contracts] deploying contracts');
    const opts = {
        cwd: path.resolve(path.join(__dirname, 'contracts')),
        env: {
            DEPLOYER_PRIVATE_KEY,
            ...process.env,
        },
    };
    execSync(`forge script script/Deploy.sol:GameDeployer --broadcast --rpc-url "http://localhost:8545"`, opts);
}, 1000);

async function deployer() {
    const dirs = ['contracts/src'];
    // wait for chain to become available
    let ready = false;
    await sleep(2000);
    const provider = new JsonRpcProvider('http://localhost:8545');
    ready = await Promise.race([
        provider.send("eth_blockNumber"),
        sleep(2000).then(() => undefined),
    ]);
    if (!ready) {
        console.log('[contracts] rpc endpoint unavailable');
        shutdown('failed to connect to network');
    }
    // watch for changes to the contracts to trigger contract deployments
    const watcher = chokidar.watch(dirs, {
        persistent: true
    });
    watcher
        .on('add', deploy)
        .on('change', deploy)
        .on('unlink', deploy)
        .on('error', error => console.error(`Watcher error: ${error}`));
    console.log(`[contracts] watching:`, dirs);
    return watcher;
}
const watcher = deployer()
    .catch((err) => shutdown(err))

processes.result
    .then(() => console.log('shutdown'))
    .catch(() => console.error('stopped'))
    .finally(() => watcher.then(w => w ? w.close() : null))
    .then(() => shutdown())
    .then(() => process.exit())



const concurrently = require('concurrently');
const fs = require('fs').promises;
const path = require('path');
const { execSync } = require("child_process");

// ------------------------------------------------------------------
// this is a startup script for running a local build of downstream
// ------------------------------------------------------------------
//

const SEQUENCER_PRIVATE_KEY = "095a37ef5b5d87db7fe50551725cb64804c8c554868d3d729c0dd17f0e664c87";
const DEPLOYER_PRIVATE_KEY = "0x6335c92c05660f35b36148bbfb2105a68dd40275ebf16eff9524d487fb5d57a8";

// configure services to run

// get duck burger hq building HERE, dupe it (* number of dvbBuildings) and put it in a new temp test folder, then if dvbBuildings is > 0, do the same as apply example-plugins, but instead test-buildings-temp dir

// write javascript code that duplicates the content of the files in "./contracts/src/example-plugins/DuckBurger/" and puts them in a new 
// folder (if it doesn't already exist) at "./contracts/src/test-plugins/DuckBurgerTest/". 

const dvbBuildings = Math.min(10, process.argv[2]); // Capped to 10

async function duplicateFiles() {
    const targetMapDir = './contracts/src/test-plugins/';
    
    // if input is 0, recursively delete test-plugins
    if (dvbBuildings === 0) {
        await deleteDirectory(targetMapDir);
        return;
    }

    const sourceDir = './contracts/src/example-plugins/DuckBurger/';
    const targetDir = './contracts/src/test-plugins/DuckBurgerTest/';

    // first delete DuckBurgerTest - note it wouldn't delete map.yaml if it exists - TODO: make sure it does?
    await deleteAndCreateDir(targetDir);
    const files = await fs.readdir(sourceDir);

    // loop through files in sourceDir, make a new yaml in targetDir and adjust building name (file and builing kind)
    for (const file of files) {
        const sourcePath = path.join(sourceDir, file);
        if (file.endsWith('.yaml')) {
            const content = await fs.readFile(sourcePath, 'utf8');
            for (let i = 1; i <= dvbBuildings; i++) {
                const modifiedContent = modifyYamlContent(content, i);
                const newFilename = file.replace('.yaml', `_${i}.yaml`);
                const targetPath = path.join(targetDir, newFilename);
                await fs.writeFile(targetPath, modifiedContent, 'utf8');
            }
        } else {
            // if not yaml file, we just need to copy it over, no need for multiple of the same thing
            const targetPath = path.join(targetDir, file);
            await fs.copyFile(sourcePath, targetPath);
        }
    }

    // in try catch to output errors, can be removed because it outputs to a txt file
    try{
        // this list includes the names so it knows where to put what
        const buildingsDuckBurger = [
            {'name': 'Duck Burger HQ', 'x': 0, 'y': 0, 'z': 0}, 
            {'name': 'Burger Display Building', 'x': 5, 'y': 0, 'z': -5}, 
            {'name': 'Duck Display Building', 'x': -5, 'y': 0, 'z': 5}, 
            {'name': 'Countdown Building', 'x': 2, 'y': -4, 'z': 2}];
        const tiles = generateHexagonalGrid(5);

        // generate the map.yaml content
        let mapYamlContent = '';
        for (let i = 1; i <= dvbBuildings; i++) {
            mapYamlContent += generateMapSection(tiles, buildingsDuckBurger, i);
        }

        // write the map.yaml file
        const mapFilePath = path.join(targetMapDir, 'map.yaml');
        await fs.writeFile(mapFilePath, mapYamlContent, 'utf8');
    }catch (error){
        // log the error to a text file in targetMapDir
        const errorFilePath = path.join(targetMapDir, 'error_log.txt');
        const errorMessage = `Error occurred: ${error.message}\n`;
        await fs.appendFile(errorFilePath, errorMessage, 'utf8');
    }
}

function generateHexagonalGrid(radius) {
    let _tiles = [];

    for (let x = -radius; x <= radius; x++) {
        for (let y = Math.max(-radius, -x - radius); y <= Math.min(radius, -x + radius); y++) {
            let z = -x - y;
            if (Math.abs(x) + Math.abs(y) + Math.abs(z) <= radius * 2) {
                _tiles.push({ x: x, y: y, z: z });
            }
        }
    }

    return _tiles;
}

function generateMapSection(tiles, buildings, iteration) {
    const displacement = 11 * (iteration - 1); // maybe 11 can be changed to radius * 2 + 1 ?
    let yamlContent = '';

    // process tiles
    for (const tile of tiles) {
        if (tile && typeof tile.x === 'number' && typeof tile.y === 'number' && typeof tile.z === 'number') {
            const modifiedX = tile.x + displacement;
            const modifiedZ = tile.z - displacement;
            yamlContent += `---
kind: Tile
spec:
  biome: DISCOVERED
  location: [ ${modifiedX}, ${tile.y}, ${modifiedZ} ]

`;
        } else {
            console.error('Invalid tile data', tile);
        }
    }

    // process buildings
    for (const building of buildings) {
        if (building && typeof building.x === 'number' && typeof building.y === 'number' && typeof building.z === 'number') {
            const modifiedX = building.x + displacement;
            const modifiedZ = building.z - displacement;
            yamlContent += `---
kind: Building
spec:
  name: ${building.name}_${iteration}
  location: [ ${modifiedX}, ${building.y}, ${modifiedZ} ]

`;
        } else {
            console.error('Invalid building data', building);
        }
    }

    return yamlContent;
}

async function deleteDirectory(dir) {
    try {
        await fs.rm(dir, { recursive: true, force: true });
    } catch (err) {
        console.error(`Error deleting directory: ${dir}`, err);
    }
}

async function deleteAndCreateDir(dir) {
    try {
        await fs.rm(dir, { recursive: true });
    } catch (err) {
        // Ignore error if the directory does not exist
    }
    await fs.mkdir(dir, { recursive: true });
}

function modifyYamlContent(content, index) {
    return content.replace(/(spec:\s+name: )(.+)/, `$1$2_${index}`);
}

duplicateFiles().catch(console.error);

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
            && ds -k ${DEPLOYER_PRIVATE_KEY} -n local apply -R -f ${dvbBuildings > 0 ? "./src/test-plugins/" : "./src/maps/tiny"} --max-connections 500 \
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



const fs = require('fs').promises;
const path = require('path');

module.exports.buildPerformanceTest = async function(arenas){
    try{
        await duplicateFiles(arenas);
        return {MapName: "../test-plugins"}
    } catch(e){
        // log the error to a text file in targetMapDir
        const errorFilePath = path.join('../contracts/src/test-plugins/', 'error_log.txt');
        const errorMessage = `Error occurred: ${e.message}\n`;
        await fs.appendFile(errorFilePath, errorMessage, 'utf8');
        return {error: e.message, MapName: "default"};
    }
};

// duplicates the content of the files in "./contracts/src/example-plugins/DuckBurger/"
// puts them in a new folder (if it doesn't already exist) at "./contracts/src/test-plugins/DuckBurgerTest/"
async function duplicateFiles(arenas) {
    const targetMapDir = './contracts/src/test-plugins/';

    // if input is 0, recursively delete test-plugins
    if (arenas === 0) {
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
        if (file.endsWith('.yaml') && file != "TeamBuildings.yaml") {
            const content = await fs.readFile(sourcePath, 'utf8');
            for (let i = 1; i <= arenas; i++) {
                const modifiedContent = modifyYamlContent(content, i);
                const newFilename = file.replace('.yaml', `_${i}.yaml`);
                const targetPath = path.join(targetDir, newFilename);
                await fs.writeFile(targetPath, modifiedContent, 'utf8');
            }
        }
        else if (file == 'DuckBurgerHQ.js'){
            const content = await fs.readFile(sourcePath, 'utf8');
            for (let i = 1; i <= arenas; i++) {
                const modifiedContent = modifyJsContent(content, i);
                const newFilename = file.replace('.js', `_${i}.js`);
                const targetPath = path.join(targetDir, newFilename);
                await fs.writeFile(targetPath, modifiedContent, 'utf8');
            }
        } else {
            // if not yaml file or DuckBurgerHQ.js, we just need to copy it over
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
        for (let i = 1; i <= arenas; i++) {
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
    // add _{index} to the end of BuildingKind names
    content = content.replace(/(spec:\s+name: )(.+)/, `$1$2_${index}`);

    if (content.includes("Duck Burger HQ")){
        // add _{index} to the end of .js
        // this is because the DuckBurgerHQ.js code needs to find the specific display buildings and the js needs to know the name of them
        content = content.replace(/(\.js)/g, `_${index}$1`);
    }
    
    return content;
}

function modifyJsContent(content, index) {
    return content.replace(/(Burger Display Building|Duck Display Building|Countdown Building|Duck Burger HQ)/g, `$1_${index}`);
}
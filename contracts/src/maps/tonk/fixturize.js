const fs = require('fs');
const path = require('path');
const os = require('os');
const process = require('process');

// Replace ~ with the actual home directory
const homeDirectory = os.homedir();

// Define source and destination paths
const sources = [
    './TonkTower',
    './Depots/MemeGenerator',
    './Depots/HexDump',
    './Depots/SelfiePoint'
];
const destination = path.join(homeDirectory, 'Workspace/ds/contracts/src/fixtures/debug-us/');


async function copyFile(sourcePath, destPath) {
    return new Promise((resolve, reject) => {
        const readStream = fs.createReadStream(sourcePath);
        const writeStream = fs.createWriteStream(destPath);
        
        readStream.on('error', reject);
        writeStream.on('error', reject);
        writeStream.on('finish', resolve);

        readStream.pipe(writeStream);
    });
}

async function copyFilesFromDirectory(sourceDir) {
    const files = fs.readdirSync(sourceDir);

    for (const file of files) {
        const sourceFilePath = path.join(sourceDir, file);
        let destFilePath = path.join(destination, file);

        if (file === 'manifest.yaml') {
            const parentDirName = path.basename(sourceDir);
            destFilePath = path.join(destination, `${parentDirName}.yaml`);
        }

        await copyFile(sourceFilePath, destFilePath);
    }
}

async function main() {
    for (const source of sources) {
        await copyFilesFromDirectory(source);
    }
    await copyFile(path.join(process.cwd(),'map.yaml'), path.join(destination, 'map.yaml'));
    console.log("Files copied successfully!");
}

main().catch(error => {
    console.error("An error occurred:", error);
});
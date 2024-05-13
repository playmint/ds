import ds from "downstream";

const TILE_ID_PREFIX = "0xe5a62ffc";

export default async function update(state) {
    const map = [];
    //console.log(state);

    const mobileUnit = getMobileUnit(state);

    const printThese = [];

    const z = hexToSignedDecimal(state.world.key);
    const middleCoords = [z, 0, 7, -7];
    const allRoomTiles = getTilesInRange(middleCoords, 3);
    const walkableTiles = getWalkableTilesInRange(middleCoords, 3);
    allRoomTiles.forEach((tileId) => {
        if (walkableTiles.includes(tileId)) {
            map.push({
                type: "tile",
                key: "color",
                id: tileId,
                value: "#32B25A",
            });
        } else {
            map.push({
                type: "tile",
                key: "color",
                id: tileId,
                value: "#EC5C61",
            });
            //printThese.push(tileId);
        }
    });

    // // code to compile unwalkable tile IDs
    // let string = "unwalkableTiles = [\n";
    // printThese.forEach((tileId) => {
    //     string += "bytes24(" + tileId + "),\n";
    // });
    // string += "];";
    // console.log(string);

    return {
        version: 1,
        map: map,
        components: [],
    };
}

// --- Helper functions ---

// Get the mobile unit from the state
function getMobileUnit(state) {
    return state?.selected?.mobileUnit;
}

// Convert hexadecimal to signed decimal
function hexToSignedDecimal(hex) {
    if (hex.startsWith("0x")) {
        hex = hex.substr(2);
    }

    let num = parseInt(hex, 16);
    let bits = hex.length * 4;
    let maxVal = Math.pow(2, bits);

    // Check if the highest bit is set (negative number)
    if (num >= maxVal / 2) {
        num -= maxVal;
    }

    return num;
}

// Get tile coordinates from hexadecimal coordinates
function getTileCoords(coords) {
    return [
        hexToSignedDecimal(coords[0]),
        hexToSignedDecimal(coords[1]),
        hexToSignedDecimal(coords[2]),
        hexToSignedDecimal(coords[3]),
    ];
}

// Calculate distance between two tiles
function distance(tileCoords, nextTile) {
    return Math.max(
        Math.abs(tileCoords[0] - nextTile[0]),
        Math.abs(tileCoords[1] - nextTile[1]),
        Math.abs(tileCoords[2] - nextTile[2]),
    );
}

// Convert an integer to a 16-bit hexadecimal string
function toInt16Hex(value) {
    return ("0000" + toTwos(value, 16).toString(16)).slice(-4);
}

const BN_0 = BigInt(0);
const BN_1 = BigInt(1);

// Convert a two's complement binary representation to a BigInt
function fromTwos(n, w) {
    let value = BigInt(n);
    let width = BigInt(w);
    if (value >> (width - BN_1)) {
        const mask = (BN_1 << width) - BN_1;
        return -((~value & mask) + BN_1);
    }
    return value;
}

// Convert a BigInt to a two's complement binary representation
function toTwos(_value, _width) {
    let value = BigInt(_value);
    let width = BigInt(_width);
    const limit = BN_1 << (width - BN_1);
    if (value < BN_0) {
        value = -value;
        const mask = (BN_1 << width) - BN_1;
        return (~value & mask) + BN_1;
    }
    return value;
}

// Get tile ID from coordinates
function getTileIdFromCoords(coords) {
    const z = toInt16Hex(coords[0]);
    const q = toInt16Hex(coords[1]);
    const r = toInt16Hex(coords[2]);
    const s = toInt16Hex(coords[3]);
    return `${TILE_ID_PREFIX}000000000000000000000000${z}${q}${r}${s}`;
}

// Decode a tile ID into its q, r, s hexagonal coordinates
function getTileCoordsFromId(tileId) {
    const coords = [...tileId]
        .slice(2)
        .reduce((bs, b, idx) => {
            if (idx % 4 === 0) {
                bs.push("0x");
            }
            bs[bs.length - 1] += b;
            return bs;
        }, [])
        .map((n) => Number(fromTwos(n, 16)))
        .slice(-4);
    if (coords.length !== 4) {
        throw new Error(`failed to get z,q,r,s from tile id ${tileId}`);
    }
    return coords;
}

function getTilesInRange(middleCoords, range) {
    const [z, q, r, s] = middleCoords;
    let tilesInRange = [];
    for (let dx = -range; dx <= range; dx++) {
        for (
            let dy = Math.max(-range, -dx - range);
            dy <= Math.min(range, -dx + range);
            dy++
        ) {
            const dz = -dx - dy;
            const tileId = getTileIdFromCoords([z, q + dx, r + dy, s + dz]);
            tilesInRange.push(tileId);
        }
    }
    return tilesInRange;
}

function getWalkableTilesInRange(middleCoords, range) {
    const [z, q, r, s] = middleCoords;
    let tilesInRange = [];
    for (let dx = -range; dx <= range; dx++) {
        for (
            let dy = Math.max(-range, -dx - range);
            dy <= Math.min(range, -dx + range);
            dy++
        ) {
            const dz = -dx - dy;
            const theseCoords = [z, q + dx, r + dy, s + dz];
            if (theseCoords[1] == 0 || theseCoords[2] == 7 || theseCoords[3] == -7) {
                const tileId = getTileIdFromCoords([z, q + dx, r + dy, s + dz]);
                tilesInRange.push(tileId);
            }            
        }
    }
    return tilesInRange;
}

function logState(state) {
    console.log("State sent to pluging:", state);
}

// the source for this code is on github where you can find other example buildings:
// https://github.com/playmint/ds/tree/main/contracts/src/example-plugins

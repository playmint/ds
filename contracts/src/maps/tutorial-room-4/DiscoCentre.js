import ds from 'downstream';

let disco = false;
let dressed = false;
let selectedTux = 1;
const TILE_COLOUR_DISTANCE = 3;
const TILE_ID_PREFIX = "0xe5a62ffc";

const toggleDisco = () => {
    disco = !disco;
};

const toggleDressed = () => {
    dressed = !dressed;
};

const changeTux = () => {
    selectedTux = selectedTux % 2 + 1;
};

export default async function update(state) {

    const discoCentre = state.world?.buildings.find(
        (b) => b.kind?.name?.value == "Disco Centre",
    );

    if (!discoCentre){
        return;
    }

    const map = [];
    const buttons = [];

    buttons.push({
        text: `${disco ? 'Disable' : 'Enable'} Disco 🪩`,
        type: 'action',
        action: toggleDisco,
        disabled: false,
    });

    const mobileUnit = getMobileUnit(state);
    const unitTileId = null;

    if (mobileUnit){
        const buildingTileCoords = getTileCoords(discoCentre?.location?.tile?.coords);
        const unitTileCoords = getTileCoords(mobileUnit?.nextLocation?.tile?.coords);
        const unitDistanceFromBuilding = distance(buildingTileCoords, unitTileCoords);

        if (unitDistanceFromBuilding <= TILE_COLOUR_DISTANCE) {
            // Yellow tile under the unit
            map.push({
                type: 'tile',
                key: 'color',
                id: getTileIdFromCoords(unitTileCoords),
                value: '#ffff00',
            });
        }

        if (dressed){
            if (unitDistanceFromBuilding <= TILE_COLOUR_DISTANCE){
                // Change unit model
                map.push({
                    type: "unit",
                    key: "model",
                    id: mobileUnit.id,
                    value: `Unit_Tuxedo_0${selectedTux}`,
                });
            }            

            // Add button to change tuxedo model variation
            buttons.push({
                text: `Change Tuxedo 🔄`,
                type: 'action',
                action: changeTux,
                disabled: false,
            });
        }

        // Add button to wear/remove tuxedo
        buttons.push({
            text: dressed ? 'Remove Tuxedo 🙎‍♂️' : 'Wear Tuxedo 🤵',
            type: 'action',
            action: toggleDressed,
            disabled: false,
        });
    }

    if (disco) {
        getTilesInRange(discoCentre, TILE_COLOUR_DISTANCE).forEach((t) => {
            if (t !== unitTileId) {
                map.push(
                    {
                        type: "tile",
                        key: "color",
                        id: `${t}`,
                        value: randomColour(),
                    }
                );
            }      
        });
    }

    return {
        version: 1,
        map: map,
        components: [
            {
                id: 'colour-controller',
                type: 'building',
                content: [
                    {
                        id: 'default',
                        type: 'inline',
                        html: '<p>Let\'s party!</p>',
                        buttons: buttons,
                    },
                ],
            },
        ],
    };
}

function randomColour() {
    const red = Math.floor(Math.random() * 256);
    const green = Math.floor(Math.random() * 256);
    const blue = Math.floor(Math.random() * 256);
    return `#${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`;
}

function getMobileUnit(state) {
    return state?.selected?.mobileUnit;
}

function getTileCoords(coords) {
    return [
        hexToSignedDecimal(coords[1]),
        hexToSignedDecimal(coords[2]),
        hexToSignedDecimal(coords[3]),
    ];
}

function getTileIdFromCoords(coords) {
    return `${TILE_ID_PREFIX}0000000000000000000000000000${toInt16Hex(coords[0])}${toInt16Hex(coords[1])}${toInt16Hex(coords[2])}`;
}

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

function distance(tileCoords, nextTile) {
    return Math.max(
        Math.abs(tileCoords[0] - nextTile[0]),
        Math.abs(tileCoords[1] - nextTile[1]),
        Math.abs(tileCoords[2] - nextTile[2]),
    );
}

/**
 * Converts an integer value to a hexadecimal string of 16 bits width
 * @param {number} value - The integer value to convert.
 * @returns {string} A 4-character hexadecimal string representation of the value.
 */
function toInt16Hex(value) {
    return ('0000'+toTwos(value, 16).toString(16)).slice(-4)
}

const BN_0 = BigInt(0);
const BN_1 = BigInt(1);

/**
 * Converts a two's complement binary representation to a BigInt.
 * @param {number|string} n - The two's complement binary number.
 * @param {number} w - The width (in bits) of the binary number.
 * @returns {BigInt} The BigInt representation of the binary number.
 */
function fromTwos(n, w) {
    let value = BigInt(n);
    let width = BigInt(w);
    if (value >> (width - BN_1)) {
        const mask = (BN_1 << width) - BN_1;
        return -(((~value) & mask) + BN_1);
    }
    return value;
}

/**
 * Converts a BigInt to a two's complement binary representation.
 * @param {BigInt} _value - The BigInt number to convert.
 * @param {number} _width - The desired width of the binary representation.
 * @returns {BigInt} The two's complement binary representation of the value.
 */
function toTwos(_value, _width) {
    let value = BigInt(_value);
    let width = BigInt(_width);
    const limit = (BN_1 << (width - BN_1));
    if (value < BN_0) {
        value = -value;
        const mask = (BN_1 << width) - BN_1;
        return ((~value) & mask) + BN_1;
    }
    return value;
}

/**
 * Calculates the IDs of tiles within a certain range of a given building based on its location.
 * @param {object} building - The building object containing location information.
 * @param {number} range - The range within which to find tiles.
 * @returns {Array} An array of strings representing the IDs of the tiles within the given range.
 */
function getTilesInRange(building, range) {
    const [q,r,s] = getTileCoordsFromId(building.location?.tile?.id);
    let tilesInRange = [];
    for (let dx = -range; dx <= range; dx++) {
        for (let dy = Math.max(-range, -dx-range); dy <= Math.min(range, -dx+range); dy++) {
            const dz = -dx-dy;
            const tileId = getTileIdFromCoords([q+dx, r+dy, s+dz]);
            tilesInRange.push(tileId);
        }
    }
    return tilesInRange;
}

/**
 * Decodes a tile ID into its q, r, s hexagonal coordinates.
 * @param {string} tileId - The ID of the tile to decode.
 * @returns {Array} An array containing the q, r, s coordinates of the tile.
 */
function getTileCoordsFromId(tileId) {
    const coords = [...tileId]
        .slice(2)
        .reduce((bs, b, idx) => {
            if (idx % 4 === 0) {
                bs.push('0x');
            }
            bs[bs.length - 1] += b;
            return bs;
        }, [])
        .map((n) => Number(fromTwos(n, 16)))
        .slice(-3);
    if (coords.length !== 3) {
        throw new Error(`failed to get q,r,s from tile id ${tileId}`);
    }
    return coords;
};

function logState(state) {
    console.log('State sent to pluging:', state);
}

// the source for this code is on github where you can find other example buildings:
// https://github.com/playmint/ds/tree/main/contracts/src/example-plugins
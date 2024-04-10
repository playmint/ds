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
            // Orange tile under the unit
            map.push({
                type: 'tile',
                key: 'color',
                id: getTileIdFromCoords(unitTileCoords),
                value: '#f58c02',
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

        if (disco) {
            getTilesInRange(discoCentre, TILE_COLOUR_DISTANCE).forEach((t) => {
                if (t !== unitTileId) {
                    map.push(
                        {
                            type: "tile",
                            key: "color",
                            id: `${t}`,
                            value: themedRandomColour(),
                        }
                    );
                }      
            });
        }else{
            getTilesInRange(discoCentre, TILE_COLOUR_DISTANCE).forEach((t) => {
                if (t !== unitTileId) {
                    map.push(
                        {
                            type: "tile",
                            key: "color",
                            id: `${t}`,
                            value: '#3386d4',
                        }
                    );
                }      
            });
        }
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

// Generate a random color from a predefined set
function themedRandomColour(){
    const colours = ['#0000FF', '#1E90FF', '#ADD8E6', '#87CEEB', '#00008B', '#FFD700', '#FFFF00', '#FFA500', '#FF8C00'];
    return colours[Math.floor(Math.random() * colours.length)];
}

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
    return ('0000'+toTwos(value, 16).toString(16)).slice(-4)
}

const BN_0 = BigInt(0);
const BN_1 = BigInt(1);

// Convert a two's complement binary representation to a BigInt
function fromTwos(n, w) {
    let value = BigInt(n);
    let width = BigInt(w);
    if (value >> (width - BN_1)) {
        const mask = (BN_1 << width) - BN_1;
        return -(((~value) & mask) + BN_1);
    }
    return value;
}

// Convert a BigInt to a two's complement binary representation
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
                bs.push('0x');
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
};

// Calculate the IDs of tiles within a certain range of a given building based on its location
function getTilesInRange(building, range) {
    const [z,q,r,s] = getTileCoordsFromId(building.location?.tile?.id);
    let tilesInRange = [];
    for (let dx = -range; dx <= range; dx++) {
        for (let dy = Math.max(-range, -dx-range); dy <= Math.min(range, -dx+range); dy++) {
            const dz = -dx-dy;
            const tileId = getTileIdFromCoords([z, q+dx, r+dy, s+dz]);
            tilesInRange.push(tileId);
        }
    }
    return tilesInRange;
}

function logState(state) {
    console.log('State sent to pluging:', state);
}

// the source for this code is on github where you can find other example buildings:
// https://github.com/playmint/ds/tree/main/contracts/src/example-plugins
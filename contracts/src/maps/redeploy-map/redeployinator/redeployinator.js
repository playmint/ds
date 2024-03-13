import ds from 'downstream';

let savedBuildings = [];
let savedBags = [];

export default async function update(state) {
    // uncomment this to browse the state object in browser console
    // this will be logged when selecting a unit and then selecting an instance of this building
    //logState(state);

    const selectedTile = getSelectedTile(state);
    const selectedBuilding = selectedTile && getBuildingOnTile(state, selectedTile);
    const canCraft = selectedBuilding && inputsAreCorrect(state, selectedBuilding)
    // uncomment this to be restrictve about which units can craft
    // this is a client only check - to enforce it in contracts make
    // similar changes in BasicFactory.sol
    //    && unitIsFriendly(state, selectedBuilding)
        ;

        const redeploy = () => {
            const actions = savedBuildings.map(savedBuilding => {
                const { kind, location } = savedBuilding;
                const { tile } = location;
                const { id } = kind;
        
                const [q, r, s] = getTileCoords(tile.coords);
        
                console.log(`Preparing to spawn building with kind id: ${id} at coordinates: (${q}, ${r}, ${s})`);
        
                return {
                    name: "DEV_SPAWN_BUILDING",
                    args: [id, q, r, s],
                };
            });
        
            console.log(`Dispatching ${actions.length} DEV_SPAWN_BUILDING actions`);
            ds.dispatch(...actions);
            console.log('Dispatch complete');
        };
        
        const saveWorldState = () => {
            const { world } = state;
            savedBuildings = world.buildings;
            savedBags = world.bags;
            console.log(`Saved ${savedBuildings.length} buildings`, savedBuildings);
            console.log(`Saved ${savedBags.length} bags`, savedBags);
        };
        
        const logWorldState = () => {
            const { world } = state;
            console.log('state.world:', world);
        };

    return {
        version: 1,
        components: [
            {
                id: 'basic-factory',
                type: 'building',
                content: [
                    {
                        id: 'default',
                        type: 'inline',
                        html: '',
                        buttons: [
                            {
                                text: 'Save World',
                                type: 'action',
                                action: saveWorldState,
                                disabled: false,
                            },
                            {
                                text: 'Redeploy',
                                type: 'action',
                                action: redeploy,
                                disabled: false,
                            },
                            {
                                text: 'Log World State',
                                type: 'action',
                                action: logWorldState,
                                disabled: false,
                            },
                        ],
                    },
                ],
            },
        ],
    };
}

function getMobileUnit(state) {
    return state?.selected?.mobileUnit;
}

function getSelectedTile(state) {
    const tiles = state?.selected?.tiles || {};
    return tiles && tiles.length === 1 ? tiles[0] : undefined;
}

function getBuildingOnTile(state, tile) {
    return (state?.world?.buildings || []).find((b) => tile && b.location?.tile?.id === tile.id);
}

// returns an array of items the building expects as input
function getRequiredInputItems(building) {
    return building?.kind?.inputs || [];
}

// search through all the bags in the world to find those belonging to this building
function getBuildingBags(state, building) {
    return building ? (state?.world?.bags || []).filter((bag) => bag.equipee?.node.id === building.id) : [];
}

// get building input slots
function getInputSlots(state, building) {
    // inputs are the bag with key 0 owned by the building
    const buildingBags = getBuildingBags(state, building);
    const inputBag = buildingBags.find((bag) => bag.equipee.key === 0);

    // slots used for crafting have sequential keys startng with 0
    return inputBag && inputBag.slots.sort((a, b) => a.key - b.key);
}

// are the required craft input items in the input slots?
function inputsAreCorrect(state, building) {
    const requiredInputItems = getRequiredInputItems(building);
    const inputSlots = getInputSlots(state, building);

    return (
        inputSlots &&
        inputSlots.length >= requiredInputItems.length &&
        requiredInputItems.every(
            (requiredItem) =>
                inputSlots[requiredItem.key].item.id == requiredItem.item.id &&
                inputSlots[requiredItem.key].balance == requiredItem.balance
        )
    );
}

function logState(state) {
    console.log('State sent to pluging:', state);
}

const friendlyPlayerAddresses = [
    // 0x402462EefC217bf2cf4E6814395E1b61EA4c43F7
];

function unitIsFriendly(state, selectedBuilding) {
    const mobileUnit = getMobileUnit(state);
    return (
        unitIsBuildingOwner(mobileUnit, selectedBuilding) ||
        unitIsBuildingAuthor(mobileUnit, selectedBuilding) ||
        friendlyPlayerAddresses.some((addr) => unitOwnerConnectedToWallet(state, mobileUnit, addr))
    );
}

function unitIsBuildingOwner(mobileUnit, selectedBuilding) {
    //console.log('unit owner id:',  mobileUnit?.owner?.id, 'building owner id:', selectedBuilding?.owner?.id);
    return mobileUnit?.owner?.id && mobileUnit?.owner?.id === selectedBuilding?.owner?.id;
}

function unitIsBuildingAuthor(mobileUnit, selectedBuilding) {
    //console.log('unit owner id:',  mobileUnit?.owner?.id, 'building author id:', selectedBuilding?.kind?.owner?.id);
    return mobileUnit?.owner?.id && mobileUnit?.owner?.id === selectedBuilding?.kind?.owner?.id;
}

function unitOwnerConnectedToWallet(state, mobileUnit, walletAddress) {
    //console.log('Checking player:',  state?.player, 'controls unit', mobileUnit, walletAddress);
    return mobileUnit?.owner?.id == state?.player?.id && state?.player?.addr == walletAddress;
}

// the source for this code is on github where you can find other example buildings:
// https://github.com/playmint/ds/tree/main/contracts/src/example-plugins


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

function getTileCoords(coords) {
    return [
        hexToSignedDecimal(coords[1]),
        hexToSignedDecimal(coords[2]),
        hexToSignedDecimal(coords[3]),
    ];
}
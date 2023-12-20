import ds from 'downstream';

var numDuckStart = 0;
var numBurgerStart = 0;

var numDuck = 0;
var numBurger = 0;

var gameActive = false;

export default async function update(state) {
    // uncomment this to browse the state object in browser console
    // this will be logged when selecting a unit and then selecting an instance of this building
    //logState(state);

    const countBuildings = (buildingsArray, type) => {
        return buildingsArray.filter(building =>
            building.kind?.name?.value.toLowerCase().includes(type)
        ).length;
    }
    
    const startGame = () => {
        const buildingsArray = state.world?.buildings || [];
    
        numDuckStart = countBuildings(buildingsArray, "duck");
        numBurgerStart = countBuildings(buildingsArray, "burger");
    
        numDuck = 0;
        numBurger = 0;
        gameActive = true;
    }

    const endGame = () => {
        const buildingsArray = state.world?.buildings || [];
    
        const totalDuck = countBuildings(buildingsArray, "duck");
        const totalBurger = countBuildings(buildingsArray, "burger");
    
        numDuck = totalDuck - numDuckStart;
        numBurger = totalBurger - numBurgerStart;
        gameActive = false;
    }

    const updateNumDuckBurger = () => {
        const buildingsArray = state.world?.buildings || [];
    
        const totalDuck = countBuildings(buildingsArray, "duck");
        const totalBurger = countBuildings(buildingsArray, "burger");
    
        numDuck = totalDuck - numDuckStart;
        numBurger = totalBurger - numBurgerStart;
    }

    if (gameActive){
        updateNumDuckBurger();
    }
    
    return {
        version: 1,
        components: [
            {
                id: 'duck-burger-counter',
                type: 'building',
                content: [
                    {
                        id: 'default',
                        type: 'inline',
                        html: `
                            🦆: ${numDuck}</br>
                            🍔: ${numBurger}</br></br>
                            ${
                                gameActive 
                                    ? `duck burger is live!</br></br>
                                    click "End & Count Score" to see who won`
                                    : `click "Start Game" to play`
                            }
                        `,

                        buttons: [
                            {
                                text: 'Start Game',
                                type: 'action',
                                action: startGame,
                                disabled: gameActive,
                            },
                            {
                                text: 'End Game',
                                type: 'action',
                                action: endGame,
                                disabled: !gameActive,
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

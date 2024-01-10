import ds from 'downstream';

const prizeFee = 10;
const buildingPrizeBagSlot = 0;
const buildingPrizeItemSlot = 0;
const unitPrizeBagSlot = 0;
const unitPrizeItemSlot = 0;

function getHQData(buildingId) {
    const description = buildingId?.kind?.description?.value || "";
    let values = description.split(', ').map(Number);
    return {
        team1Units: values[0]
    };
}

export default async function update(state) {

    const join = () => {
        const mobileUnit = getMobileUnit(state);

        const payload = ds.encodeCall(
            "function join()",
            []
        );
        
        const dummyBagIdIncaseToBagDoesNotExist = `0x${'00'.repeat(24)}`;

        ds.dispatch(
            {
                name: 'TRANSFER_ITEM_MOBILE_UNIT',
                args: [
                    mobileUnit.id,
                    [mobileUnit.id, selectedBuilding.id],
                    [unitPrizeBagSlot, buildingPrizeBagSlot ],
                    [unitPrizeItemSlot, buildingPrizeItemSlot],
                    dummyBagIdIncaseToBagDoesNotExist,
                    prizeFee,
                    ],
            },
            {
                name: 'BUILDING_USE',
                args: [selectedBuilding.id, mobileUnit.id, payload],
            }
        );
    }

    const start = () => { }

    const claim = () => {
        const mobileUnit = getMobileUnit(state);

        const payload = ds.encodeCall(
            "function claim()",
            []
        );
        
        ds.dispatch(
            {
                name: 'BUILDING_USE',
                args: [selectedBuilding.id, mobileUnit.id, payload],
            }
        );
     }

    const reset = () => { }

    // uncomment this to browse the state object in browser console
    // this will be logged when selecting a unit and then selecting an instance of this building
    //logState(state);

    // find all HQs
    // run this update for each of them:

    const selectedTile = getSelectedTile(state);
    const selectedBuilding = selectedTile && getBuildingOnTile(state, selectedTile);
    
    const {team1Units} = getHQData(selectedBuilding);

    // get contract data
    // - initially from description
    // - then converted to use the new data

    // check current game state:
    // - NotStarted : GameActive == false
    // - Running : GameActive == true && endBlock < currentBlock
    // - GameOver : GameActive == true && endBlock >= currentBlock

    let buttonList = [];
    let htmlBlock = '<p>Ducks vs Burgers HQ</p>';
    // map data

    // switch (state)
    // case NotStared:
    //  enable join
    //  check unit has entrance fee
    const canJoin = true; // hasEntranceFee();
    buttonList.push({ text: 'Join Game', type: 'action', action: join, disabled: !canJoin });
    htmlBlock += `<p>Joined Unit is ${team1Units}</p>`
    //  check for enough joiners and enable start
    //
    // case Running:
    //  show count
    //
    // case GameOver:
    // enable claim (if on winning team)
    // enable reset
    const canClaim = true;
    buttonList.push({ text: 'Claim Prize', type: 'action', action: claim, disabled: !canClaim });

    return {
        version: 1,
        // map: []
        components: [
            {
                id: 'dbhq',
                type: 'building',
                content: [
                    {
                        id: 'default',
                        type: 'inline',
                        html: htmlBlock,
                        buttons: buttonList,
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

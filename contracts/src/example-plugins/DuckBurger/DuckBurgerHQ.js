import ds from 'downstream';

const prizeFee = 2;
const buildingPrizeBagSlot = 0;
const buildingPrizeItemSlot = 0;
const unitPrizeBagSlot = 0;
const unitPrizeItemSlot = 0;

function getHQData(buildingId) {
    const description = buildingId?.kind?.description?.value || "";
    let values = description.split(', ').map(Number);
    return {
        prizePool: values[0],
        gameActive: values[1] === 1,
        endBlock: values[2]
    };
}

function formatTime(timeInMs) {
    let seconds = Math.floor(timeInMs / 1000);
    let minutes = Math.floor(seconds / 60);
    let hours = Math.floor(minutes / 60);

    seconds %= 60;
    minutes %= 60;

    // Pad each component to ensure two digits
    let formattedHours = String(hours).padStart(2, '0');
    let formattedMinutes = String(minutes).padStart(2, '0');
    let formattedSeconds = String(seconds).padStart(2, '0');

    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
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

    const start = () => {
        const mobileUnit = getMobileUnit(state);
        const payload = ds.encodeCall(
            "function start(uint24 duckBuildingID, uint24 burgerBuildingID)",
            [0, 0]
        );
        
        ds.dispatch(
            {
                name: 'BUILDING_USE',
                args: [selectedBuilding.id, mobileUnit.id, payload],
            }
        );
     }

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

    const reset = () => {
        const mobileUnit = getMobileUnit(state);
        const payload = ds.encodeCall(
            "function reset()",
            []
        );
        
        ds.dispatch(
            {
                name: 'BUILDING_USE',
                args: [selectedBuilding.id, mobileUnit.id, payload],
            }
        );
     }

    // uncomment this to browse the state object in browser console
    // this will be logged when selecting a unit and then selecting an instance of this building
    //logState(state);

    // find all HQs
    // run this update for each of them:

    const selectedTile = getSelectedTile(state);
    const selectedBuilding = selectedTile && getBuildingOnTile(state, selectedTile);
    
    const {prizePool, gameActive, endBlock} = getHQData(selectedBuilding);



    // get contract data
    // - initially from description
    // - then converted to use the new data

    // check current game state:
    // - NotStarted : GameActive == false
    // - Running : GameActive == true && endBlock < currentBlock
    // - GameOver : GameActive == true && endBlock >= currentBlock

    let buttonList = [];
    let htmlBlock = '<p>Ducks vs Burgers HQ</p></br>';

    htmlBlock += `<p>payout for win: ${prizeFee * 2}</p>`;
    htmlBlock += `<p>payout for draw: ${prizeFee}</p></br>`;
    // map data

    // switch (state)
    // case NotStared:
    //  enable join
    //  check unit has entrance fee
    const canJoin = !gameActive; // hasEntranceFee();

    if (canJoin){
        htmlBlock += `<p>player's joined: ${prizePool > 0 ? prizePool / prizeFee : 0}</p>`;
    }

    buttonList.push({ text: `Join Game (${prizeFee} Green Goo)`, type: 'action', action: join, disabled: !canJoin });

    const canStart = !gameActive && prizePool >= prizeFee * 2;

    buttonList.push({ text: 'Start', type: 'action', action: start, disabled: !canStart });
    //htmlBlock += `<p>Joined Unit is ${team1Units}</p>`
    //  check for enough joiners and enable start
    //
    // case Running:
    //  show count

    const nowBlock = state?.world?.block;
    const blocksLeft = endBlock > nowBlock ? endBlock - nowBlock : 0;
    const timeLeftMs = blocksLeft * 2 * 1000;

    if (gameActive && blocksLeft > 0){
        
        htmlBlock += `<p>time remaining: ${formatTime(timeLeftMs)}</p>`;
    }
    //
    // case GameOver:
    // enable claim (if on winning team)
    // enable reset
    const canClaim = gameActive && blocksLeft == 0;
    buttonList.push({ text: prizePool > 0 ? `Claim Reward` : 'Nothing to Claim', type: 'action', action: claim, disabled: !canClaim });
    buttonList.push({ text: 'Reset', type: 'action', action: reset, disabled: false });

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

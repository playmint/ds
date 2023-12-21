import ds from 'downstream';

const secondsPerBlock = 2;
const secondsPerSession = 10 * 60;
const blocksPerSession = secondsPerSession / secondsPerBlock;

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

function nymberToBytes32(number) {
    let hexStr = number.toString(16);
    if (hexStr.length > 8) {
        hexStr = hexStr.substring(hexStr.length - 8);
    }
    while (hexStr.length < 8) {
        hexStr = '0' + hexStr;
    }
    return '0x' + hexStr;
}

export default async function update(state) {
    // uncomment this to browse the state object in browser console
    // this will be logged when selecting a unit and then selecting an instance of this building
    //logState(state);

    const selectedTile = getSelectedTile(state);
    const selectedBuilding = selectedTile && getBuildingOnTile(state, selectedTile);
    
    const endBlock = selectedBuilding?.kind?.description?.value || "0";
    const nowBlock = state?.world?.block;
    const blocksLeft = endBlock > nowBlock ? endBlock - nowBlock : 0;
    const timeLeftMs = blocksLeft * secondsPerBlock * 1000;
    
    const startSession = () =>  {
        const mobileUnit = getMobileUnit(state);
        payload = nymberToBytes32(blocksPerSession);

        console.log(`Starting session for ${blocksPerSession} blocks (${payload})`);

        ds.dispatch({
            name: 'BUILDING_USE',
            args: [selectedBuilding.id, mobileUnit.id, payload],
        });
    }

    return {
        version: 1,
        components: [
            {
                id: 'session-timer',
                type: 'building',
                content: [
                    {
                        id: 'default',
                        type: 'inline',
                        html: `${formatTime(timeLeftMs)}`,
                        buttons: [
                            {
                                text: 'Start',
                                type: 'action',
                                action: startSession,
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

// No atob function in quickJS.
function base64_decode(s) {
    var base64chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    // remove/ignore any characters not in the base64 characters list
    //  or the pad character -- particularly newlines
    s = s.replace(new RegExp("[^" + base64chars.split("") + "=]", "g"), "");
  
    // replace any incoming padding with a zero pad (the 'A' character is zero)
    var p =
      s.charAt(s.length - 1) == "="
        ? s.charAt(s.length - 2) == "="
          ? "AA"
          : "A"
        : "";
    var r = "";
    s = s.substr(0, s.length - p.length) + p;
  
    // increment over the length of this encoded string, four characters at a time
    for (var c = 0; c < s.length; c += 4) {
      // each of these four characters represents a 6-bit index in the base64 characters list
      //  which, when concatenated, will give the 24-bit number for the original 3 characters
      var n =
        (base64chars.indexOf(s.charAt(c)) << 18) +
        (base64chars.indexOf(s.charAt(c + 1)) << 12) +
        (base64chars.indexOf(s.charAt(c + 2)) << 6) +
        base64chars.indexOf(s.charAt(c + 3));
  
      // split the 24-bit number into the original three 8-bit (ASCII) characters
      r += String.fromCharCode((n >>> 16) & 255, (n >>> 8) & 255, n & 255);
    }
    // remove any zero pad that was added to make this a multiple of 24 bits
    return r.substring(0, r.length - p.length);
  }

// the source for this code is on github where you can find other example buildings:
// https://github.com/playmint/ds/tree/main/contracts/src/example-plugins

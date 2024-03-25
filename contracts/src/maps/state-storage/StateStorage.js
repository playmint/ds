import ds from "downstream";

export default async function update(state) {
    // uncomment this to browse the state object in browser console
    // this will be logged when selecting a unit and then selecting an instance of this building
    // logState(state);

    const selectedTile = getSelectedTile(state);
    const selectedBuilding =
        selectedTile && getBuildingOnTile(state, selectedTile);
    const canCraft =
        selectedBuilding && inputsAreCorrect(state, selectedBuilding);

    console.log(selectedBuilding);

    const constructionBlockNum = selectedBuilding
        ? (selectedBuilding.constructionBlockNum?.value || 0)
        : 0;

    const incrementHex = getData(selectedBuilding, "increment");
    const increment =
        typeof incrementHex === "string" && parseInt(incrementHex, 16);

    const unitId = getData(selectedBuilding, "actor");

    const boolVal = getDataBool(selectedBuilding, "boolVal");

    const updateData = () => {
        const mobileUnit = getMobileUnit(state);

        if (!mobileUnit) {
            console.log("no selected unit");
            return;
        }

        ds.dispatch({
            name: "BUILDING_USE",
            args: [selectedBuilding.id, mobileUnit.id, []],
        });
    };

    return {
        version: 1,
        components: [
            {
                id: "state-storage-test",
                type: "building",
                content: [
                    {
                        id: "default",
                        type: "inline",
                        html: `
                            <p>Pressing the 'Update Data' button will set the variable 'actor' to the selected MobileUnit and will increment the variable 'increment'</p>
                            <h3>Construction block num</h3>
                            ${constructionBlockNum}
                            <h3>Last called by mobile unit:</h3>
                            ${unitId ? unitId.slice(-4) : "0x0"}
                            <h3>Increment</h3>
                            ${increment}
                            <h3>Bool val</h3>
                            ${boolVal}
                        `,
                        buttons: [
                            {
                                text: "Update Data",
                                type: "action",
                                action: updateData,
                                disabled: !canCraft,
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
    return (state?.world?.buildings || []).find(
        (b) => tile && b.location?.tile?.id === tile.id,
    );
}

// returns an array of items the building expects as input
function getRequiredInputItems(building) {
    return building?.kind?.inputs || [];
}

// search through all the bags in the world to find those belonging to this building
function getBuildingBags(state, building) {
    return building
        ? (state?.world?.bags || []).filter(
              (bag) => bag.equipee?.node.id === building.id,
          )
        : [];
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
                inputSlots[requiredItem.key].balance == requiredItem.balance,
        )
    );
}

function getData(buildingInstance, key) {
    return getKVPs(buildingInstance)[key];
}

function getDataBool(buildingInstance, key) {
    var hexVal = getData(buildingInstance, key);
    return typeof hexVal === "string" ? parseInt(hexVal, 16) == 1 : false;
}

function getKVPs(buildingInstance) {
    return buildingInstance.allData.reduce((kvps, data) => {
        kvps[data.name] = data.value;
        return kvps;
    }, {});
}

function logState(state) {
    console.log("State sent to pluging:", state);
}

const friendlyPlayerAddresses = [
    // 0x402462EefC217bf2cf4E6814395E1b61EA4c43F7
];

function unitIsFriendly(state, selectedBuilding) {
    const mobileUnit = getMobileUnit(state);
    return (
        unitIsBuildingOwner(mobileUnit, selectedBuilding) ||
        unitIsBuildingAuthor(mobileUnit, selectedBuilding) ||
        friendlyPlayerAddresses.some((addr) =>
            unitOwnerConnectedToWallet(state, mobileUnit, addr),
        )
    );
}

function unitIsBuildingOwner(mobileUnit, selectedBuilding) {
    //console.log('unit owner id:',  mobileUnit?.owner?.id, 'building owner id:', selectedBuilding?.owner?.id);
    return (
        mobileUnit?.owner?.id &&
        mobileUnit?.owner?.id === selectedBuilding?.owner?.id
    );
}

function unitIsBuildingAuthor(mobileUnit, selectedBuilding) {
    //console.log('unit owner id:',  mobileUnit?.owner?.id, 'building author id:', selectedBuilding?.kind?.owner?.id);
    return (
        mobileUnit?.owner?.id &&
        mobileUnit?.owner?.id === selectedBuilding?.kind?.owner?.id
    );
}

function unitOwnerConnectedToWallet(state, mobileUnit, walletAddress) {
    //console.log('Checking player:',  state?.player, 'controls unit', mobileUnit, walletAddress);
    return (
        mobileUnit?.owner?.id == state?.player?.id &&
        state?.player?.addr == walletAddress
    );
}

// the source for this code is on github where you can find other example buildings:
// https://github.com/playmint/ds/tree/main/contracts/src/example-plugins

import ds from "downstream";

export default async function update(state) {
    // uncomment this to browse the state object in browser console
    // this will be logged when selecting a unit and then selecting an instance of this building
    // logState(state);

    const selectedTile = getSelectedTile(state);
    const selectedBuilding =
        selectedTile && getBuildingOnTile(state, selectedTile);

    if (selectedBuilding) {
        console.log(selectedBuilding);
    }

    const hasIdCard =
        getItemBalance(
            getMobileUnit(state),
            "Gate Key",
            state?.world?.bags ?? [],
        ) > 0;

    const pluginBuildings = getBuildingsByKindName(state, "example gate");
    const pluginBuildingTileIDs = pluginBuildings.map(
        (b) => b.location.tile.id,
    );
    const blockerTileMapObjs = pluginBuildingTileIDs.map((t) => {
        return {
            type: "tile",
            key: "blocker",
            id: t,
            value: `${!hasIdCard}`,
        };
    });
    const tileColorMapObjs = pluginBuildingTileIDs.map((t) => {
        return {
            type: "tile",
            key: "color",
            id: t,
            value: hasIdCard ? "green" : "red",
        };
    });

    return {
        version: 1,
        map: blockerTileMapObjs.concat(tileColorMapObjs),
        components: [
            {
                id: "state-storage-test",
                type: "building",
                content: [
                    {
                        id: "default",
                        type: "inline",
                        html: `
                            <p>${
                                hasIdCard
                                    ? "✅ You have a <b>Gate Key</b> so you may pass"
                                    : "❌ You don't have a <b>Gate Key</b> so you cannot pass"
                            }</p>
                            <br/>
                            <p>This building's graphQL fragment is logged to the console where you can see the custom data that has been set on it</p>
                        `,
                        buttons: [],
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

function getBuildingsByKindName(state, kindName) {
    return (state?.world?.buildings || []).filter(
        (b) => b.kind?.name?.value === kindName,
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

function getItemBalance(mobileUnit, itemName, worldBags) {
    const selectedUnitBags = mobileUnit
        ? (worldBags || []).filter(
              (bag) => bag.equipee?.node?.id === mobileUnit.id,
          )
        : [];
    return selectedUnitBags.reduce((total, bag) => {
        return (
            total +
            bag.slots.reduce((bagTotal, slot) => {
                return slot.item.name.value === itemName
                    ? bagTotal + slot.balance
                    : bagTotal;
            }, 0)
        );
    }, 0);
}

/**
 * Converts a BigInt to a two's complement binary representation.
 * @param {BigInt} _value - The BigInt number to convert.
 * @param {number} _width - The desired width of the binary representation.
 * @returns {BigInt} The two's complement binary representation of the value.
 */
function toTwos(_value, _width) {
    const BN_0 = BigInt(0);
    const BN_1 = BigInt(1);

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

/**
 * Converts an integer value to a hexadecimal string of 16 bits width
 * @param {number} value - The integer value to convert.
 * @returns {string} A 4-character hexadecimal string representation of the value.
 */
function toInt16Hex(value) {
    return ("0000" + toTwos(value, 16).toString(16)).slice(-4);
}

// the source for this code is on github where you can find other example buildings:
// https://github.com/playmint/ds/tree/main/contracts/src/example-plugins

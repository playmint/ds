import ds from "downstream";

const prizeFee = 2;
const buildingPrizeBagSlot = 0;
const buildingPrizeItemSlot = 0;
const unitPrizeBagSlot = 0;
const unitPrizeItemSlot = 0;
const nullBytes24 = `0x${"00".repeat(24)}`;

function getHQData(selectedBuilding) {
    const prizePool = getDataInt(selectedBuilding, "prizePool");
    const gameActive = getDataBool(selectedBuilding, "gameActive");
    const endBlock = getDataInt(selectedBuilding, "endBlock");
    const buildingKindIdA = getDataBytes24(selectedBuilding, "buildingKindIdA");
    const buildingKindIdB = getDataBytes24(selectedBuilding, "buildingKindIdB");
    return {
        prizePool,
        gameActive,
        endBlock,
        buildingKindIdA,
        buildingKindIdB,
    };
}

function formatTime(timeInMs) {
    let seconds = Math.floor(timeInMs / 1000);
    let minutes = Math.floor(seconds / 60);
    let hours = Math.floor(minutes / 60);

    seconds %= 60;
    minutes %= 60;

    // Pad each component to ensure two digits
    let formattedHours = String(hours).padStart(2, "0");
    let formattedMinutes = String(minutes).padStart(2, "0");
    let formattedSeconds = String(seconds).padStart(2, "0");

    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
}

function range5(state, building) {
    const range = 5;
    const tileCoords = getTileCoords(building?.location?.tile?.coords);
    let i = 0;
    const foundBuildings = [];
    for (let q = tileCoords[0] - range; q <= tileCoords[0] + range; q++) {
        for (let r = tileCoords[1] - range; r <= tileCoords[1] + range; r++) {
            let s = -q - r;
            let nextTile = [q, r, s];
            if (distance(tileCoords, nextTile) <= range) {
                state?.world?.buildings.forEach((b) => {
                    const buildingCoords = getTileCoords(
                        b.location.tile.coords,
                    );
                    if (
                        buildingCoords[0] == nextTile[0] &&
                        buildingCoords[1] == nextTile[1] &&
                        buildingCoords[2] == nextTile[2]
                    ) {
                        foundBuildings[i] = b;
                        i++;
                    }
                });
            }
        }
    }
    return foundBuildings;
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

function getTileCoords(coords) {
    return [
        hexToSignedDecimal(coords[1]),
        hexToSignedDecimal(coords[2]),
        hexToSignedDecimal(coords[3]),
    ];
}

function distance(tileCoords, nextTile) {
    return Math.max(
        Math.abs(tileCoords[0] - nextTile[0]),
        Math.abs(tileCoords[1] - nextTile[1]),
        Math.abs(tileCoords[2] - nextTile[2]),
    );
}

const countBuildings = (buildingsArray, kindID) => {
    return buildingsArray.filter((b) => b.kind?.id == kindID).length;
};

let burgerCounter;
let duckCounter;

export default async function update(state) {
    const join = () => {
        const mobileUnit = getMobileUnit(state);

        const payload = ds.encodeCall("function join()", []);

        const dummyBagIdIncaseToBagDoesNotExist = `0x${"00".repeat(24)}`;

        ds.dispatch(
            {
                name: "TRANSFER_ITEM_MOBILE_UNIT",
                args: [
                    mobileUnit.id,
                    [mobileUnit.id, selectedBuilding.id],
                    [unitPrizeBagSlot, buildingPrizeBagSlot],
                    [unitPrizeItemSlot, buildingPrizeItemSlot],
                    dummyBagIdIncaseToBagDoesNotExist,
                    prizeFee,
                ],
            },
            {
                name: "BUILDING_USE",
                args: [selectedBuilding.id, mobileUnit.id, payload],
            },
        );
    };

    const start = (values) => {
        const selectedBuildingIdA = values["buildingKindIdA"];
        const selectedBuildingIdB = values["buildingKindIdB"];

        console.log("values:", values);

        // Verify selected buildings are different from each other
        if (selectedBuildingIdA == selectedBuildingIdB) {
            console.error(
                "Team A and Team B buildings must be different from each other",
                { selectedBuildingIdA, selectedBuildingIdB },
            );
            return;
        }

        const mobileUnit = getMobileUnit(state);
        const payload = ds.encodeCall(
            "function start(bytes24 duckBuildingID, bytes24 burgerBuildingID)",
            [selectedBuildingIdA, selectedBuildingIdB],
        );

        ds.dispatch({
            name: "BUILDING_USE",
            args: [selectedBuilding.id, mobileUnit.id, payload],
        });
    };

    const claim = () => {
        const mobileUnit = getMobileUnit(state);

        const payload = ds.encodeCall("function claim()", []);

        ds.dispatch({
            name: "BUILDING_USE",
            args: [selectedBuilding.id, mobileUnit.id, payload],
        });
    };

    const reset = () => {
        const mobileUnit = getMobileUnit(state);
        const payload = ds.encodeCall("function reset()", []);

        ds.dispatch({
            name: "BUILDING_USE",
            args: [selectedBuilding.id, mobileUnit.id, payload],
        });
    };

    // uncomment this to browse the state object in browser console
    // this will be logged when selecting a unit and then selecting an instance of this building
    logState(state);

    // find all HQs
    // run this update for each of them:
    const dvbBuildingName = "Duck Burger HQ";
    const selectedBuilding = state.world?.buildings.find(
        (b) => b.kind?.name?.value == dvbBuildingName,
    );
    if (!selectedBuilding) {
        console.log("NO DVB BUILDING FOUND");
        return {
            version: 1,
            map: [],
            components: [
                {
                    id: "dbhq",
                    type: "building",
                    content: [
                        {
                            id: "default",
                            type: "inline",
                            html: "",
                            buttons: [],
                        },
                    ],
                },
            ],
        };
    }

    const {
        prizePool,
        gameActive,
        endBlock,
        buildingKindIdA,
        buildingKindIdB,
    } = getHQData(selectedBuilding);

    //We control what these buildings are called, so we can grab 'em by name:
    const burgerCounterKindId = "Burger Display Building";
    const duckCounterKindId = "Duck Display Building";

    // These fellas will need to be provided by drop down:
    const burgerBuildingKindId =
        "0xbe92755c00000000000000002bbd60790000000000000003";
    const duckBuildingKindId =
        "0xbe92755c0000000000000000d87342e30000000000000003";

    let duckCount = 0;
    let burgerCount = 0;

    if (selectedBuilding) {
        const localBuildings = range5(state, selectedBuilding);
        if (!burgerCounter) {
            burgerCounter = localBuildings.find((element) =>
                getBuildingKindsByTileLocation(
                    state,
                    element,
                    burgerCounterKindId,
                ),
            );
        }
        if (!duckCounter) {
            duckCounter = localBuildings.find((element) =>
                getBuildingKindsByTileLocation(
                    state,
                    element,
                    duckCounterKindId,
                ),
            );
        }
    } else {
        console.log("NO SELECTED TILE");
    }

    if (state && state.world && state.world.buildings) {
        burgerCount = countBuildings(
            state.world?.buildings,
            burgerBuildingKindId,
        );
        duckCount = countBuildings(state.world?.buildings, duckBuildingKindId);
    }

    // get contract data
    // - initially from description
    // - then converted to use the new data

    // check current game state:
    // - NotStarted : GameActive == false
    // - Running : GameActive == true && endBlock < currentBlock
    // - GameOver : GameActive == true && endBlock >= currentBlock

    let buttonList = [];
    let htmlBlock = "<p>Ducks vs Burgers HQ</p></br>";

    htmlBlock += `<p>payout for win: ${prizeFee * 2}</p>`;
    htmlBlock += `<p>payout for draw: ${prizeFee}</p></br>`;
    // map data

    // switch (state)
    // case NotStared:
    //  enable join
    //  check unit has entrance fee
    const canJoin = !gameActive; // hasEntranceFee();

    if (canJoin) {
        htmlBlock += `<p>player's joined: ${
            prizePool > 0 ? prizePool / prizeFee : 0
        }</p>`;
    }

    buttonList.push({
        text: `Join Game (${prizeFee} Green Goo)`,
        type: "action",
        action: join,
        disabled: !canJoin,
    });

    const canStart = !gameActive && prizePool >= prizeFee * 2;
    if (canStart) {
        // Show options to select team buildings
        htmlBlock += `
            <h3>Select Team Buildings</h3>
            <p>Team 1</p>
            ${getBuildingKindSelectHtml(state, "buildingKindIdA")}
            <p>Team 2</p>
            ${getBuildingKindSelectHtml(state, "buildingKindIdB")}
        `;
    }

    buttonList.push({
        text: "Start",
        type: "action",
        action: start,
        disabled: !canStart,
    });
    //htmlBlock += `<p>Joined Unit is ${team1Units}</p>`
    //  check for enough joiners and enable start
    //
    // case Running:
    //  show count

    const nowBlock = state?.world?.block;
    const blocksLeft = endBlock > nowBlock ? endBlock - nowBlock : 0;
    const timeLeftMs = blocksLeft * 2 * 1000;

    if (gameActive) {
        // Display selected team buildings
        const buildingKindA =
            state.world.buildingKinds.find((b) => b.id === buildingKindIdA) ||
            {};
        const buildingKindB =
            state.world.buildingKinds.find((b) => b.id === buildingKindIdB) ||
            {};
        htmlBlock += `
            <h3>Team Buildings:</h3>
            <p>Team 1: ${buildingKindA.name?.value}</p>
            <p>Team 2: ${buildingKindB.name?.value}</p>

        `;

        if (blocksLeft > 0) {
            htmlBlock += `<p>time remaining: ${formatTime(timeLeftMs)}</p>`;
        }
    }
    //
    // case GameOver:
    // enable claim (if on winning team)
    // enable reset
    const canClaim = gameActive && blocksLeft == 0;
    buttonList.push({
        text: prizePool > 0 ? `Claim Reward` : "Nothing to Claim",
        type: "action",
        action: claim,
        disabled: !canClaim,
    });
    buttonList.push({
        text: "Reset",
        type: "action",
        action: reset,
        disabled: false,
    });
    const mapObj = [
        {
            type: "building",
            id: `${burgerCounter ? burgerCounter.id : ""}`,
            key: "labelText",
            value: `${burgerCount}`,
        },
        {
            type: "building",
            id: `${duckCounter ? duckCounter.id : ""}`,
            key: "labelText",
            value: `${duckCount}`,
        },
    ];

    return {
        version: 1,
        map: mapObj,
        components: [
            {
                id: "dbhq",
                type: "building",
                content: [
                    {
                        id: "default",
                        type: "inline",
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
    return (state?.world?.buildings || []).find(
        (b) => tile && b.location?.tile?.id === tile.id,
    );
}

function getBuildingKindsByTileLocation(state, building, kindID) {
    return (state?.world?.buildings || []).find(
        (b) => b.id === building.id && b.kind?.name?.value == kindID,
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

function getBuildingKindSelectHtml(state, selectId) {
    return `
        <select id="${selectId}" name="${selectId}">
            ${state.world.buildingKinds.map(
                (b) => `
                    <option value="${b.id}">${b.name.value}</option>
                `,
            )}
        </select>
    `;
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

// -- Building Data

function getData(buildingInstance, key) {
    return getKVPs(buildingInstance)[key];
}

function getDataBool(buildingInstance, key) {
    var hexVal = getData(buildingInstance, key);
    return typeof hexVal === "string" ? parseInt(hexVal, 16) == 1 : false;
}

function getDataInt(buildingInstance, key) {
    var hexVal = getData(buildingInstance, key);
    return typeof hexVal === "string" ? parseInt(hexVal, 16) : 0;
}

function getDataBytes24(buildingInstance, key) {
    var hexVal = getData(buildingInstance, key);
    return typeof hexVal === "string" ? hexVal.slice(0, -16) : nullBytes24;
}

function getKVPs(buildingInstance) {
    return buildingInstance.allData.reduce((kvps, data) => {
        kvps[data.name] = data.value;
        return kvps;
    }, {});
}

// the source for this code is on github where you can find other example buildings:
// https://github.com/playmint/ds/tree/main/contracts/src/example-plugins

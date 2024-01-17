import ds from "downstream";

const prizeFee = 2;
const prizeItemId = "0x6a7a67f063976de500000001000000010000000000000000"; // green goo
const buildingPrizeBagSlot = 0;
const buildingPrizeItemSlot = 0;
const nullBytes24 = `0x${"00".repeat(24)}`;
const duckBuildingTopId = "04";
const burgerBuildingTopId = "17";

function getHQData(selectedBuilding) {
    const prizePool = getDataInt(selectedBuilding, "prizePool");
    const gameActive = getDataBool(selectedBuilding, "gameActive");
    const startBlock = getDataInt(selectedBuilding, "startBlock");
    const endBlock = getDataInt(selectedBuilding, "endBlock");
    const buildingKindIdDuck = getDataBytes24(
        selectedBuilding,
        "buildingKindIdDuck",
    );
    const buildingKindIdBurger = getDataBytes24(
        selectedBuilding,
        "buildingKindIdBurger",
    );
    return {
        prizePool,
        gameActive,
        startBlock,
        endBlock,
        startBlock,
        buildingKindIdDuck,
        buildingKindIdBurger,
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
                    if (!b?.location?.tile?.coords) return;

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

const countBuildings = (buildingsArray, kindID, startBlock, endBlock) => {
    return buildingsArray.filter(
        (b) =>
            b.kind?.id == kindID &&
            b.contructionBlockNum >= startBlock &&
            b.contructionBlockNum <= endBlock,
    ).length;
};

function getMobileUnitFeeSlot(state) {
    const mobileUnit = getMobileUnit(state);
    const mobileUnitBags = mobileUnit ? getEquipeeBags(state, mobileUnit) : [];
    const { bag, slotKey } = findBagAndSlot(
        mobileUnitBags,
        prizeItemId,
        prizeFee,
    );
    const unitFeeBagSlot = bag ? bag.equipee.key : -1;
    const unitFeeItemSlot = bag ? slotKey : -1;
    return {
        unitFeeBagSlot,
        unitFeeItemSlot,
    };
}

let burgerCounter;
let duckCounter;
let countdownBuilding;
let startTime;
let endTime;

export default async function update(state) {
    // An action can set a form submit handler which will be called after the action along with the form values
    let handleFormSubmit;

    const join = () => {
        if (unitFeeBagSlot < 0) {
            console.log(
                "fee not found in bags - button should have been disabled",
            );
        }
        const mobileUnit = getMobileUnit(state);

        const payload = ds.encodeCall("function join()", []);

        const dummyBagIdIncaseToBagDoesNotExist = `0x${"00".repeat(24)}`;

        ds.dispatch(
            {
                name: "TRANSFER_ITEM_MOBILE_UNIT",
                args: [
                    mobileUnit.id,
                    [mobileUnit.id, selectedBuilding.id],
                    [unitFeeBagSlot, buildingPrizeBagSlot],
                    [unitFeeItemSlot, buildingPrizeItemSlot],
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

    // NOTE: Because the 'action' doesn't get passed the form values we are setting a global value to a function that will
    const start = () => {
        handleFormSubmit = startSubmit;
    };

    const startSubmit = (values) => {
        const selectedBuildingIdDuck = values["buildingKindIdDuck"];
        const selectedBuildingIdBurger = values["buildingKindIdBurger"];

        console.log("start(): form.currentValues", values);

        // Verify selected buildings are different from each other
        if (selectedBuildingIdDuck == selectedBuildingIdBurger) {
            console.error("Team buildings must be different from each other", {
                selectedBuildingIdDuck,
                selectedBuildingIdBurger,
            });
            return;
        }

        const mobileUnit = getMobileUnit(state);
        const payload = ds.encodeCall(
            "function start(bytes24 duckBuildingID, bytes24 burgerBuildingID)",
            [selectedBuildingIdDuck, selectedBuildingIdBurger],
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
    // very spammy for a plugin marked as alwaysActive
    //logState(state);

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
        startBlock,
        endBlock,
        buildingKindIdDuck,
        buildingKindIdBurger,
    } = getHQData(selectedBuilding);

    const { unitFeeBagSlot, unitFeeItemSlot } = getMobileUnitFeeSlot(state);
    const hasFee = unitFeeBagSlot >= 0;

    //We control what these buildings are called, so we can grab 'em by name:
    const burgerCounterKindId = "Burger Display Building";
    const duckCounterKindId = "Duck Display Building";
    const countdownBuildingKindId = "Countdown Building";

    let duckCount = 0;
    let burgerCount = 0;

    const localBuildings = range5(state, selectedBuilding);

    if (!burgerCounter) {
        burgerCounter = localBuildings.find((element) =>
            getBuildingKindsByTileLocation(state, element, burgerCounterKindId),
        );
    }
    if (!duckCounter) {
        duckCounter = localBuildings.find((element) =>
            getBuildingKindsByTileLocation(state, element, duckCounterKindId),
        );
    }
    if (!countdownBuilding) {
        countdownBuilding = localBuildings.find((element) =>
            getBuildingKindsByTileLocation(
                state,
                element,
                countdownBuildingKindId,
            ),
        );
    }
    if (state && state.world && state.world.buildings) {
        duckCount = countBuildings(
            state.world?.buildings,
            buildingKindIdDuck,
            startBlock,
            endBlock,
        );
        burgerCount = countBuildings(
            state.world?.buildings,
            buildingKindIdBurger,
            startBlock,
            endBlock,
        );
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
    const canJoin = !gameActive && hasFee;

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
            <p>Team 🐤</p>
            ${getBuildingKindSelectHtml(
                state,
                duckBuildingTopId,
                "buildingKindIdDuck",
            )}
            <p>Team 🍔</p>
            ${getBuildingKindSelectHtml(
                state,
                burgerBuildingTopId,
                "buildingKindIdBurger",
            )}
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
    const blocksFromStart = startBlock < nowBlock ? nowBlock - startBlock : 30;
    const timeLeftMs = blocksLeft * 2 * 1000;
    const timeSinceStartMs = blocksFromStart * 2 * 1000;

    if (gameActive) {
        // Display selected team buildings
        const buildingKindDuck =
            state.world.buildingKinds.find(
                (b) => b.id === buildingKindIdDuck,
            ) || {};
        const buildingKindBurger =
            state.world.buildingKinds.find(
                (b) => b.id === buildingKindIdBurger,
            ) || {};
        htmlBlock += `
            <h3>Team Buildings:</h3>
            <p>Team 🐤: ${buildingKindDuck.name?.value}</p>
            <p>Team 🍔: ${buildingKindBurger.name?.value}</p>

        `;

        if (blocksLeft > 0) {
            const now = Date.now();
            if (!startTime) startTime = now - timeSinceStartMs;
            if (!endTime) endTime = now + timeLeftMs;
            htmlBlock += `<p>time remaining: ${formatTime(timeLeftMs)}</p>`;
        }
    } else {
        startTime = undefined;
        endTime = undefined;
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

    if (gameActive && blocksLeft > 0) {
        mapObj.push(
            {
                type: "building",
                id: `${countdownBuilding ? countdownBuilding.id : ""}`,
                key: "countdown-start",
                value: `${startTime}`,
            },
            {
                type: "building",
                id: `${countdownBuilding ? countdownBuilding.id : ""}`,
                key: "countdown-end",
                value: `${endTime}`,
            },
        );
    } else {
        mapObj.push({
            type: "building",
            id: `${countdownBuilding ? countdownBuilding.id : ""}`,
            key: "labelText",
            value: "",
        });
    }

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
                        submit: (values) => {
                            if (typeof handleFormSubmit == "function") {
                                handleFormSubmit(values);
                            }
                        },
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

// search through all the bags in the world to find those belonging to this eqipee
// eqipee maybe a building, a mobileUnit or a tile
function getEquipeeBags(state, equipee) {
    return equipee
        ? (state?.world?.bags || []).filter(
              (bag) => bag.equipee?.node.id === equipee.id,
          )
        : [];
}

// get first slot in bags that matches item requirements
function findBagAndSlot(bags, requiredItemId, requiredBalance) {
    for (const bag of bags) {
        for (const slotKey in bag.slots) {
            const slot = bag.slots[slotKey];
            if (
                (!requiredItemId || slot.item.id == requiredItemId) &&
                requiredBalance <= slot.balance
            ) {
                return {
                    bag: bag,
                    slotKey: slot.key, // assuming each slot has a 'key' property
                };
            }
        }
    }
    return { bag: null, slotKey: -1 };
}

// get building input slots
function getInputSlots(state, building) {
    // inputs are the bag with key 0 owned by the building
    const buildingBags = getEquipeeBags(state, building);
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

function getBuildingKindSelectHtml(state, buildingTopId, selectId) {
    return `
        <select id="${selectId}" name="${selectId}">
            ${state.world.buildingKinds
                .filter(
                    (b) =>
                        b.model &&
                        b.model.value.substring(3, 5) === buildingTopId,
                )
                .map(
                    (b) => `
                .filter((b) => b.model && b.model.value.substring(3, 5) === buildingTopId)
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

import ds from "downstream";

const prizeFee = 2;
const prizeItemId = "0x6a7a67f08c72b94400000001000000010000000000000000"; // green goo
const buildingPrizeBagSlot = 0;
const buildingPrizeItemSlot = 0;
const nullBytes24 = `0x${"00".repeat(24)}`;
const duckBuildingTopId = "04";
const burgerBuildingTopId = "17";
const burgerCounterKindId = "Burger Display Building";
const duckCounterKindId = "Duck Display Building";
const countdownBuildingKindId = "Countdown Building";
const countdownTotalTime = 60000 * 3;

let burgerCounter;
let duckCounter;
let countdownBuilding;
let startTime;
let endTime;

export default async function update(state, block) {
    //
    // Action handler functions
    //

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
    // logState(state);

    // \todo
    // plugins run for a buildingKind and if marked as alwaysActive in the manifest
    // this update will ba called every regardless of whether a building is selected
    // so we need to find all HQs on the map and update them each in turn
    //
    // for now we just update the first we find
    const dvbBuildingName = "Duck Burger HQ";
    const selectedBuilding = state.world?.buildings.find(
        (b) => b.kind?.name?.value == dvbBuildingName,
    );

    // early out if we don't have any buildings or state isn't ready
    if (!selectedBuilding || !state?.world?.buildings) {
        // console.log("NO DVB BUILDING FOUND");
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
        teamDuckLength,
        teamBurgerLength,
    } = getHQData(selectedBuilding);

    const { unitFeeBagSlot, unitFeeItemSlot } = getMobileUnitFeeSlot(state);
    const hasFee = unitFeeBagSlot >= 0;
    const localBuildings = range5(state, selectedBuilding);
    const duckCount = countBuildings(
        localBuildings,
        buildingKindIdDuck,
        startBlock,
        endBlock,
    );
    const burgerCount = countBuildings(
        localBuildings,
        buildingKindIdBurger,
        startBlock,
        endBlock,
    );

    connectDisplayBuildings(state, localBuildings);

    // unit plugin properties - unit color
    const unitMapObj = [];
    const hqCoords = selectedBuilding.location?.tile?.coords;
    for (let i = 0; i < teamDuckLength; i++) {
        const unitId = getHQTeamUnit(selectedBuilding, "Duck", i);
        const unitCoords = state.world?.mobileUnits?.find(unit => unit.id === unitId).nextLocation?.tile?.coords;
        if (distance(getTileCoords(unitCoords), getTileCoords(hqCoords)) > 5) {
            continue;
        }
        unitMapObj.push(
            {
                type: "unit",
                key: "model",
                id: unitId,
                value: "Unit_Hoodie_02", // yellow hoodie
            }
        )
    }
    for (let i = 0; i < teamBurgerLength; i++) {
        const unitId = getHQTeamUnit(selectedBuilding, "Burger", i);
        const unitCoords = state.world?.mobileUnits?.find(unit => unit.id === unitId).nextLocation?.tile?.coords;
        if (distance(getTileCoords(unitCoords), getTileCoords(hqCoords)) > 5) {
            continue;
        }
        unitMapObj.push(
            {
                type: "unit",
                key: "model",
                id: unitId,
                value: "Unit_Hoodie_05", // red hoodie
            }
        )
    }

    // check current game state:
    // - NotStarted : GameActive == false
    // - Running : GameActive == true && endBlock < currentBlock
    // - GameOver : GameActive == true && endBlock >= currentBlock

    // we build a list of button objects that are rendered in the building UI panel when selected
    let buttonList = [];

    // we build an html block which is rendered above the buttons
    let htmlBlock = "<h3>Ducks vs Burgers HQ</h3>";
    htmlBlock += `<p>payout for win: ${prizeFee * 2}</p>`;
    htmlBlock += `<p>payout for draw: ${prizeFee}</p></br>`;

    const canJoin = !gameActive && hasFee;
    const canStart = !gameActive && teamDuckLength > 0 && teamBurgerLength > 0;

    if (canJoin) {
        htmlBlock += `<p>total players: ${
            teamDuckLength + teamBurgerLength
        }</p></br>`;
    }

    // Show what team the unit is on
    const mobileUnit = getMobileUnit(state);
    let isOnTeam = false;
    if (mobileUnit) {
        let unitTeam = "";

        for (let i = 0; i < teamDuckLength; i++) {
            if (mobileUnit.id == getHQTeamUnit(selectedBuilding, "Duck", i)) {
                unitTeam = "🐤";
                break;
            }
        }

        if (unitTeam === "") {
            for (let i = 0; i < teamBurgerLength; i++) {
                if (
                    mobileUnit.id ==
                    getHQTeamUnit(selectedBuilding, "Burger", i)
                ) {
                    unitTeam = "🍔";
                    break;
                }
            }
        }

        if (unitTeam !== "") {
            isOnTeam = true;
            htmlBlock += `
                <p>You are on team ${unitTeam}</p></br>
            `;
        }
    }

    if (!gameActive) {
        if (!isOnTeam) {
            buttonList.push({
                text: `Join Game (${prizeFee} Green Goo)`,
                type: "action",
                action: join,
                disabled: !canJoin || isOnTeam,
            });
        } else {
            // Check reason why game can't start
            const waitingForStartCondition =
                teamDuckLength != teamBurgerLength ||
                teamDuckLength + teamBurgerLength < 2;
            let startConditionMessage = "";
            if (waitingForStartCondition) {
                if (teamDuckLength + teamBurgerLength < 2) {
                    startConditionMessage = "Waiting for players...";
                } else if (teamDuckLength != teamBurgerLength) {
                    startConditionMessage = "Teams must be balanced...";
                }
            }

            buttonList.push({
                text: waitingForStartCondition
                    ? startConditionMessage
                    : "Start",
                type: "action",
                action: start,
                disabled: !canStart || teamDuckLength != teamBurgerLength,
            });
        }
    }

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

    const nowBlock = block;
    const blocksLeft = endBlock > nowBlock ? endBlock - nowBlock : 0;
    const blocksFromStart = nowBlock - startBlock;
    const timeLeftMs = blocksLeft * 2 * 1000;
    const timeSinceStartMs =
        startBlock <= nowBlock
            ? blocksFromStart * 2 * 1000
            : countdownTotalTime;

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
            <p>Team 🍔: ${buildingKindBurger.name?.value}</p></br>

        `;

        const now = Date.now();
        if (!startTime) startTime = now - timeSinceStartMs;
        if (!endTime) endTime = now + timeLeftMs;

        if (blocksLeft > 0) {
            htmlBlock += `<p>time remaining: ${formatTime(timeLeftMs)}</p>`;
        } else {
            // End of game
            buttonList.push({
                text: prizePool > 0 ? `Claim Reward` : "Nothing to Claim",
                type: "action",
                action: claim,
                disabled: prizePool == 0,
            });

            htmlBlock += `
                <h3 style="margin-top: 1em;">Game Over:</h3>
                <p>Final Score: 🐤${duckCount} : 🍔${burgerCount}
            `;
            if (duckCount == burgerCount) {
                htmlBlock += `
                    <p>The result was a draw</p>
                `;
            } else {
                const winningTeamName =
                    duckCount > burgerCount ? "duck" : "burger";
                const winningTeamEmoji = duckCount > burgerCount ? "🐤" : "🍔";
                htmlBlock += `
                    <p>Team <b>${winningTeamName}</b> have won the match!</p>
                    <p style="text-align: center;">${winningTeamEmoji}🏆</p>
                `;
            }
        }
    } else {
        startTime = undefined;
        endTime = undefined;
    }

    // Reset is always offered (requires some trust!)
    buttonList.push({
        text: "Reset",
        type: "action",
        action: reset,
        disabled: false,
    });

    // build up an array o fmap objects which are used to update display buildings
    // always show the current team counts
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

    // if the game is running show the time
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
            value: `${formatTime(countdownTotalTime)}`,
        });
    }

    return {
        version: 1,
        map: mapObj.concat(unitMapObj),
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

// --- Duckbur HQ Specific functions

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
    const teamDuckLength = getDataInt(selectedBuilding, "teamDuckLength");
    const teamBurgerLength = getDataInt(selectedBuilding, "teamBurgerLength");

    return {
        prizePool,
        gameActive,
        startBlock,
        endBlock,
        startBlock,
        buildingKindIdDuck,
        buildingKindIdBurger,
        teamDuckLength,
        teamBurgerLength,
    };
}

function getHQTeamUnit(selectedBuilding, team, index) {
    return getDataBytes24(selectedBuilding, `team${team}Unit_${index}`);
}

// search the buildings list ofr the display buildings we're gpoing to use
// for team counts and coutdown
function connectDisplayBuildings(state, buildings) {
    if (!burgerCounter) {
        burgerCounter = buildings.find((element) =>
            getBuildingKindsByTileLocation(state, element, burgerCounterKindId),
        );
    }
    if (!duckCounter) {
        duckCounter = buildings.find((element) =>
            getBuildingKindsByTileLocation(state, element, duckCounterKindId),
        );
    }
    if (!countdownBuilding) {
        countdownBuilding = buildings.find((element) =>
            getBuildingKindsByTileLocation(
                state,
                element,
                countdownBuildingKindId,
            ),
        );
    }
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

    return `${formattedMinutes}:${formattedSeconds}`;
}

const countBuildings = (buildingsArray, kindID, startBlock, endBlock) => {
    return buildingsArray.filter(
        (b) =>
            b.kind?.id == kindID &&
            b.constructionBlockNum.value >= startBlock &&
            b.constructionBlockNum.value <= endBlock,
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

// --- Generic State helper functions

function getMobileUnit(state) {
    return state?.selected?.mobileUnit;
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

function logState(state) {
    console.log("State sent to pluging:", state);
}

// get an array of buildings withiin 5 tiles of building
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

function getBuildingKindsByTileLocation(state, building, kindID) {
    return (state?.world?.buildings || []).find(
        (b) => b.id === building.id && b.kind?.name?.value == kindID,
    );
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

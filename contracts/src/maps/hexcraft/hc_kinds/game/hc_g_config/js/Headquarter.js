import ds from "downstream";

const nullBytes24 = `0x${"00".repeat(24)}`;
const redBuildingTopId = "03";
const blueBuildingTopId = "03";

export default async function update(state) {
  //
  // Action handler functions
  //
  // console.log("update 0");

  // An action can set a form submit handler which will be called after the action along with the form values
  let handleFormSubmit;

  const join = () => {
    const mobileUnit = getMobileUnit(state);

    const payload = ds.encodeCall("function join()", []);

    ds.dispatch({
      name: "BUILDING_USE",
      args: [selectedBuilding.id, mobileUnit.id, payload],
    });
  };

  // NOTE: Because the 'action' doesn't get passed the form values we are setting a global value to a function that will
  const start = () => {
    const redBaseId = getRedBases(state)[0].id;
    const blueBaseId = getBlueBases(state)[0].id;

    const payload = ds.encodeCall(
      "function start(bytes24 redBaseID, bytes24 blueBaseID)",
      [redBaseId, blueBaseId]
    );
    console.log(payload);

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

  // \todo
  // plugins run for a buildingKind and if marked as alwaysActive in the manifest
  // this update will ba called every regardless of whether a building is selected
  // so we need to find all HQs on the map and update them each in turn
  //
  // for now we just update the first we find
  const dvbBuildingName = "Headquarter";
  const selectedBuilding = state.world?.buildings.find(
    (b) => b.kind?.name?.value == dvbBuildingName
  );

  // early out if we don't have any buildings or state isn't ready
  if (!selectedBuilding || !state?.world?.buildings) {
    // console.log("NO HEADQUARTER BUILDING FOUND 8");
    return {
      version: 1,
      map: [],
      components: [
        {
          id: "headquarter",
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
    gameActive,
    buildingKindIdRed,
    buildingKindIdBlue,
    redTeamLength,
    blueTeamLength,
  } = getHQData(selectedBuilding);

  // check current game state:
  // - NotStarted : GameActive == false
  // - Running : GameActive == true && endBlock < currentBlock
  // - GameOver : GameActive == true && endBlock >= currentBlock

  // unit team colors
  const unitMapObj = [];
  const hqCoords = selectedBuilding.location?.tile?.coords;
  for (let i = 0; i < redTeamLength; i++){
    const unitId = getHQTeamUnit(selectedBuilding, "red", i);
    const unitCoords = state.world?.mobileUnits?.find(unit => unit.id === unitId).nextLocation?.tile?.coords;
    if (!inHexcraftArea(getTileCoords(unitCoords), getTileCoords(hqCoords))){
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
  for (let i = 0; i < blueTeamLength; i++){
    const unitId = getHQTeamUnit(selectedBuilding, "blue", i);
    const unitCoords = state.world?.mobileUnits?.find(unit => unit.id === unitId).nextLocation?.tile?.coords;
    if (!inHexcraftArea(getTileCoords(unitCoords), getTileCoords(hqCoords))){
        continue;
    }
    unitMapObj.push(
        {
            type: "unit",
            key: "model",
            id: unitId,
            value: "Unit_Hoodie_04",
        }
    )
  }

  // we build a list of button objects that are rendered in the building UI panel when selected
  let buttonList = [];

  // we build an html block which is rendered above the buttons
  let htmlBlock =
    '<h3><span style="color: red">Red</span> vs <span style="color: blue">Blue</span></h3>';

  const canJoin = !gameActive;

  const canStart = !gameActive && redTeamLength > 0 && blueTeamLength > 0;

  // console.log({ canStart, canJoin });
  if (canJoin) {
    htmlBlock += `<p>total players: ${redTeamLength + blueTeamLength}</p></br>`;
  }

  // Show what team the unit is on
  const mobileUnit = getMobileUnit(state);

  let isOnTeam = false;
  if (mobileUnit) {
    let unitTeam = "";

    for (let i = 0; i < redTeamLength; i++) {
      if (mobileUnit.id == getHQTeamUnit(selectedBuilding, "red", i)) {
        unitTeam = "🔴";
        break;
      }
    }

    if (unitTeam === "") {
      for (let i = 0; i < blueTeamLength; i++) {
        if (mobileUnit.id == getHQTeamUnit(selectedBuilding, "blue", i)) {
          unitTeam = "🔵";
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

  // console.log({ isOnTeam });

  if (!gameActive) {
    if (!isOnTeam) {
      buttonList.push({
        text: `Join Game`,
        type: "action",
        action: join,
        disabled: !canJoin || isOnTeam,
      });
    } else {
      // Check reason why game can't start
      let canStart = true;
      let startMessage = "Start";

      if (redTeamLength + blueTeamLength < 2) {
        canStart = false;
        startMessage = "Waiting for other player...";
      } else if (redTeamLength != blueTeamLength) {
        canStart = false;
        startMessage = "Teams must be balanced...";
      } else if (getRedBases(state).length !== 1) {
        canStart = false;
        startMessage = "Red Team must have one base...";
      } else if (getBlueBases(state).length !== 1) {
        canStart = false;
        startMessage = "Blue Team must have one base...";
      }

      buttonList.push({
        text: startMessage,
        type: "action",
        action: start,
        disabled: !canStart,
      });
    }

    // Show options to select team buildings
    htmlBlock += `
            ${checkRedBaseAmount(state)}
            ${checkBlueBaseAmount(state)}
        `;
  }
  if (gameActive) {
    htmlBlock += `
            <h3>Game Active!</h3>
        `;

    if (getBlueBases(state).length < 1) {
      htmlBlock += `
        <p>Team <b>RED</b> has won the match!</p>
        <p style="text-align: center;">🔴🏆🔴</p>
      `;
    } else if (getRedBases(state).length < 1) {
      htmlBlock += `
        <p>Team <b>BLUE</b> has won the match!</p>
        <p style="text-align: center;">🔵🏆🔵</p>
      `;
    }
  }
  // Reset is always offered (requires some trust!)
  buttonList.push({
    text: "Reset",
    type: "action",
    action: reset,
    disabled: false,
  });

  // console.log({ htmlBlock });
  return {
    version: 1,
    map: unitMapObj,
    components: [
      {
        id: "headquarter",
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

function getHQData(selectedBuilding) {
  const gameActive = getDataBool(selectedBuilding, "gameActive");
  // const startBlock = getDataInt(selectedBuilding, "startBlock");
  //  const endBlock = getDataInt(selectedBuilding, "endBlock");
  const buildingKindIdRed = getDataBytes24(
    selectedBuilding,
    "buildingKindIdRed"
  );
  const buildingKindIdBlue = getDataBytes24(
    selectedBuilding,
    "buildingKindIdBlue"
  );
  const redTeamLength = getDataInt(selectedBuilding, "redTeamLength");
  const blueTeamLength = getDataInt(selectedBuilding, "blueTeamLength");

  return {
    gameActive,
    buildingKindIdRed,
    buildingKindIdBlue,
    redTeamLength,
    blueTeamLength,
  };
}

function getHQTeamUnit(selectedBuilding, team, index) {
  return getDataBytes24(selectedBuilding, `${team}TeamUnit_${index}`);
}

// search the buildings list ofr the display buildings we're gpoing to use
// for team counts and coutdown

function getRedBases(state) {
  return state.world.buildings.filter(
    (b) => b.kind?.name?.value === "Red Base"
  );
}

function getBlueBases(state) {
  return state.world.buildings.filter(
    (b) => b.kind?.name?.value === "Blue Base"
  );
}

function checkRedBaseAmount(state) {
  // console.log(state);
  const redBaseAmount = state.world.buildings.filter(
    (b) => b.kind?.name?.value === "Red Base"
  ).length;
  if (redBaseAmount == 0) {
    return `<p>WARNING: No Red Team Base Found</p>`;
  } else if (redBaseAmount > 1) {
    return `<p>WARNING: Red Team has more than one base</p>`;
  } else {
    return "";
  }
}

function checkBlueBaseAmount(state) {
  const redBaseAmount = state.world.buildings.filter(
    (b) => b.kind?.name?.value === "Blue Base"
  ).length;
  if (redBaseAmount == 0) {
    return `<p>WARNING: No Blue Team Base Found</p>`;
  } else if (redBaseAmount > 1) {
    return `<p>WARNING: Blue Team has more than one base</p>`;
  } else {
    return "";
  }
}

// --- Generic State helper functions

function getMobileUnit(state) {
  return state?.selected?.mobileUnit;
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

function inHexcraftArea(unitCoords, hqCoords){
    const inRange = unitCoords[1] >= hqCoords[1] - 1 && unitCoords[1] <= hqCoords[1] + 18;
    const hexcraftMiddleCoords = [hqCoords[0], hqCoords[1] + 9, hqCoords[2]];
    const d = distance(hexcraftMiddleCoords, unitCoords);
    const inDistance = d <= 20;
    return inRange && inDistance;
}

// search through all the bags in the world to find those belonging to this eqipee
// eqipee maybe a building, a mobileUnit or a tile
function getEquipeeBags(state, equipee) {
  return equipee
    ? (state?.world?.bags || []).filter(
        (bag) => bag.equipee?.node.id === equipee.id
      )
    : [];
}

function logState(state) {
  console.log("State sent to pluging:", state);
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

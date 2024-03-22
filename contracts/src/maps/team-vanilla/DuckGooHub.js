import ds from "downstream";

export default async function update(state) {
    const MED_GOO_THRESH = 300;
    const STRONG_GOO_THRESH = 3000;

    const selectedTile = getSelectedTile(state);
    const selectedBuilding =
        selectedTile && getBuildingOnTile(state, selectedTile);

    const inputSlots = getInputSlots(state, selectedBuilding);

    const greenBal = inputSlots.length > 0 ? inputSlots[0].balance : 0;
    const blueBal = inputSlots.length > 1 ? inputSlots[1].balance : 0;
    const redBal = inputSlots.length > 2 ? inputSlots[2].balance : 0;
    const totalGoo = inputSlots.reduce((acc, s) => acc + s.balance, 0);

    const leaderboard = selectedBuilding.leaderboard
        ? selectedBuilding.leaderboard.sort((a, b) => b.weight - a.weight)
        : [];

    const deposit = () => {
        const mobileUnit = getMobileUnit(state);

        if (!mobileUnit) {
            ds.log("no selected unit");
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
                id: "duckGooHub",
                type: "building",
                content: [
                    {
                        id: "default",
                        type: "inline",
                        html: `
                            <p>Deposited Goo</p>
                            <p>Total: ${totalGoo}</p>
                            <br/>
                            <p>Leaderboard</p>
                            ${leaderboard
                                .slice(0, Math.min(leaderboard.length, 3))
                                .map((entry, idx) => {
                                    return `<p>${
                                        idx + 1
                                    }. ${entry.player.id.slice(-5)}: ${
                                        entry.weight
                                    }</p>`;
                                })
                                .join("")}
                            `,
                        buttons: [
                            {
                                text: "Deposit Goo",
                                type: "action",
                                action: deposit,
                                disabled: !getMobileUnit(state),
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

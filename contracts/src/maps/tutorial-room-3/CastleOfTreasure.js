import ds from 'downstream';

export default async function update(state) {
    // uncomment this to browse the state object in browser console
    // this will be logged when selecting a unit and then selecting an instance of this building
    //logState(state);

    const selectedTile = getSelectedTile(state);
    const selectedBuilding = selectedTile && getBuildingOnTile(state, selectedTile);
    const canCraft = selectedBuilding && inputsAreCorrect(state, selectedBuilding)
    // uncomment this to be restrictve about which units can craft
    // this is a client only check - to enforce it in contracts make
    // similar changes in BasicFactory.sol
    //    && unitIsFriendly(state, selectedBuilding)
        ;

    const craft = () => {
        const mobileUnit = getMobileUnit(state);

        if (!mobileUnit) {
            console.log('no selected unit');
            return;
        }

        ds.dispatch({
            name: 'BUILDING_USE',
            args: [selectedBuilding.id, mobileUnit.id, []],
        });

        console.log('Craft dispatched');
    };

    return {
        version: 1,
        components: [
            {
                id: 'basic-factory',
                type: 'building',
                content: [
                    {
                        id: 'default',
                        type: 'inline',
                        html: '<p>Fill the input slots to enable crafing</p>',
                        buttons: [
                            {
                                text: 'Craft',
                                type: 'action',
                                action: craft,
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
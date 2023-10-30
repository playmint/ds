import ds from 'downstream';

export default async function update(state) {
    
    const selectedTile = getSelectedTile(state); 
    const selectedBuilding = selectedTile && getBuildingOnTile(state, selectedTile);
    const canCraft = selectedBuilding && inputsAreCorrect(state, selectedBuilding);
    
    const craft = () => {
        const mobileUnit = getMobileUnit(state);
    
        if (!mobileUnit) {
            ds.log('no selected unit');
            return;
        }

        ds.dispatch(
            {
                name: 'BUILDING_USE',
                args: [selectedBuilding.id, mobileUnit.id, []]
            },
        );

        console.log('Craft dispatched');
    };

    return {
        version: 1,
        components: [
            {
                id: 'squircle-factory',
                type: 'building',
                content: [
                    {
                        id: 'default',
                        type: 'inline',
                        html: `
                            <p>Add 25 of each base goo item to craft a Very Important Thing</p>
                            `,
                       buttons: [ 
                            { 
                                text: 'Craft', 
                                type: 'action', 
                                action: craft, 
                                disabled: !canCraft
                            } 
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
    return (state?.world?.buildings || []).find(b => tile && b.location?.tile?.id === tile.id);
}

// returns an array of items the building expects as input
function getRequiredInputItems(building) {
     return building?.kind?.inputs || [];
}

// search through all the bags in the world to find those belonging to this building
function getBuildingBags(state, building) {
    return building
        ? (state?.world?.bags || []).filter(
            (bag) => bag.equipee?.node.id === building.id)
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
    
    return inputSlots &&
        inputSlots.length >= requiredInputItems.length &&
        requiredInputItems.every(
            (requiredItem) =>
                inputSlots[requiredItem.key].item.id == requiredItem.item.id &&
                inputSlots[requiredItem.key].balance == requiredItem.balance,
        );  
}



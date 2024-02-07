import ds from 'downstream';

export default function update({ selected, world }) {

    const { tiles, mobileUnit } = selected || {};
    const selectedTile = tiles && tiles.length === 1 ? tiles[0] : undefined;
    const selectedBuilding = (world?.buildings || []).find(b => selectedTile && b.location?.tile?.id === selectedTile.id);
    const selectedBuildingBags = selectedBuilding ? (world?.bags || []).filter(bag => bag.equipee?.node.id === selectedBuilding.id) : [];
    const selectedUnit = mobileUnit;

    // fetch the expected inputs item kinds
    const requiredInputs = selectedBuilding?.kind?.inputs || [];
    const want0 = requiredInputs.find(inp => inp.key == 0);
    const want1 = requiredInputs.find(inp => inp.key == 1);

    // fetch what is currently in the input slots
    const inputSlots = selectedBuildingBags.find(b => b.equipee.key == 0)?.slots || [];
    const got0 = inputSlots?.find(slot => slot.key == 0);
    const got1 = inputSlots?.find(slot => slot.key == 1);

    // fetch our output item details
    const expectedOutputs = selectedBuilding?.kind?.outputs || [];
    const out0 = expectedOutputs?.find(slot => slot.key == 0);
    const out1 = expectedOutputs?.find(slot => slot.key == 1);

    // try to detect if the input slots contain enough stuff to craft
    const canCraft = selectedUnit
        && want0 && got0 && want0.balance == got0.balance
        && want1 && got1 && want1.balance == got1.balance;

    const craft = () => {
        if (!selectedUnit) {
            ds.log('no selected engineer');
            return;
        }
        if (!selectedBuilding) {
            ds.log('no selected building');
            return;
        }

        ds.dispatch(
            {
                name: 'BUILDING_USE',
                args: [selectedBuilding.id, selectedUnit.id, []]
            },
        );

        //ds.log('A prescient rubber item manufacturer.');
    };


    return {
        version: 1,
        components: [
            {
                type: 'building',
                id: 'deletion-supplies',
                content: [
                    {
                        id: 'default',
                        type: 'inline',
                        html: 'One Deletion Tool per user. Please provide Registration Receipt as proof.',
                        buttons: [{ text: 'Craft Deletion Tool', type: 'action', action: craft, disabled: !canCraft }]
                    },
                ],
            },
        ],
    }
}


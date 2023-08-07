import ds from 'downstream';

export default function update({ selected, world }) {

    const { tiles, mobileUnit } = selected || {};
    const selectedTile = tiles && tiles.length === 1 ? tiles[0] : undefined;
    const selectedBuilding = selectedTile?.building;
    const selectedMobileUnit = mobileUnit;

    // fetch the expected inputs item kinds
    const requiredInputs = selectedBuilding?.kind?.inputs || [];
    const want0 = requiredInputs.find(inp => inp.key == 0);
    const want1 = requiredInputs.find(inp => inp.key == 1);

    // fetch what is currently in the input slots
    const inputSlots = selectedBuilding?.bags.find(b => b.key == 0).bag?.slots || [];
    const got0 = inputSlots?.find(slot => slot.key == 0);
    const got1 = inputSlots?.find(slot => slot.key == 1);

    // fetch our output item details
    const expectedOutputs = selectedBuilding?.kind?.outputs || [];
    const out0 = expectedOutputs?.find(slot => slot.key == 0);

    // try to detect if the input slots contain enough stuff to craft
    const canCraft = selectedMobileUnit
        && want0 && got0 && want0.balance == got0.balance
        && want1 && got1 && want1.balance == got1.balance;

    const craft = () => {
        if (!selectedMobileUnit) {
            ds.log('no unit selected');
            return;
        }
        if (!selectedBuilding) {
            ds.log('no building selected');
            return;
        }

        ds.dispatch(
            {
                name: 'BUILDING_USE',
                args: [selectedBuilding.id, selectedMobileUnit.id, []]
            },
        );

        ds.log('HammerFactory says: Hammer Time!');
    };

    return {
        version: 1,
        components: [
            {
                type: 'building',
                id: 'my-hammer-factory',
                title: 'Hammer Factory',
                summary: `Add ${want0?.balance}x ${want0?.item?.name?.value} and ${want1?.balance}x ${want1?.item?.name?.value} to craft a ${out0?.item?.name?.value}`,
                content: [
                    {
                        id: 'default',
                        type: 'inline',
                        buttons: [{ text: 'Craft Hammer', type: 'action', action: craft, disabled: !canCraft }],
                    },
                ],
            },
        ],
    };
}


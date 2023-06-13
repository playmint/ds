import ds from 'dawnseekers';

export default function update({ selected, world }) {

    const { tiles, seeker } = selected || {};
    const selectedTile = tiles && tiles.length === 1 ? tiles[0] : undefined;
    const selectedBuilding = selectedTile?.building;
    const selectedEngineer = seeker;

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
    const out1 = expectedOutputs?.find(slot => slot.key == 1);

    // try to detect if the input slots contain enough stuff to craft
    const canCraft = selectedEngineer
        && want0 && got0 && want0.balance == got0.balance
        && want1 && got1 && want1.balance == got1.balance;

    const craft = () => {
        if (!selectedEngineer) {
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
                args: [selectedBuilding.id, selectedEngineer.id, []]
            },
        );

        ds.log('A prescient rubber item manufacturer.');
    };

    return {
        version: 1,
        components: [
            {
                type: 'building',
                id: 'foul-fiends',
                title: 'All things rubber',
                summary: `We can read your mind, and can make your dreams come true (provided they're made of rubber)`,
                content: [
                    {
                        id: 'default',
                        type: 'inline',
                        buttons: [{ text: 'Gee I really want a rubber duck', type: 'action', action: craft, disabled: !canCraft }],
                    },
                ],
            },
        ],
    };
}


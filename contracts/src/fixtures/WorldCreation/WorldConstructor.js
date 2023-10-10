import ds from 'downstream';

export default function update({ selected, world }) {

    var q6cIsActive = false;


    const { tiles, mobileUnit } = selected || {};
    const selectedTile = tiles && tiles.length === 1 ? tiles[0] : undefined;
    const selectedBuilding = selectedTile?.building;
    const selectedUnit = mobileUnit;


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
    const canCraft = selectedUnit
        && want0 && got0 && want0.balance == got0.balance
        && want1 && got1 && want1.balance == got1.balance;

    const craft = () => {
        if (!selectedUnit) {
            ds.log('no selected unit');
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
    };

    if (!q6cIsActive) {
        return {
            version: 1,
            components: [
                {
                    type: 'building',
                    id: 'world-constructor',
                    content: [
                        {
                            id: 'default',
                            type: 'inline',
                            html: 'A broken component is frustrating MORTON\'s work on the next creation',
                            buttons: [{ text: 'Repair', type: 'action', action: craft, disabled: !canCraft }]
                        },
                    ],
                },
            ],
        };
    }

    else
    return {
        version: 1,
        components: [
            {
                type: 'building',
                id: 'world-constructor',
                content: [
                    {
                        id: 'default',
                        type: 'inline',
                        html: 'Thanks to your efforts the World Constructor is hard at work'
                    },
                ],
            },
        ],
    };
}


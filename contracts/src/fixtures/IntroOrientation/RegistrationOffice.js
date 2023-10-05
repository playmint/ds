import ds from 'downstream';

export default function update({ selected, world }) {

    var q1isActive = false;
    var q2IsActive = true;


    const { tiles, mobileUnit } = selected || {};
    const selectedTile = tiles && tiles.length === 1 ? tiles[0] : undefined;
    const selectedBuilding = selectedTile?.building;
    const selectedUnit = mobileUnit;


    //Look for a Registration Receipt in their bags
    var hasReceipt = false
    for (var j = 0; j < selectedUnit.bags.length; j++) {
        for (var i = 0; i < 4; i++) {
            if (selectedUnit.bags[j].bag.slots[i]) {
                var slot = selectedUnit.bags[j].bag.slots[i];

                if (slot.item && slot.item.id === 'Registration Receipt' && slot.balance >= 1) {
                    hasReceipt = true;
                }
            }
        }
    }


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

        ds.log('A prescient rubber item manufacturer.');
    };

    if (q1isActive) {
        return {
            version: 1,
            components: [
                {
                    type: 'building',
                    id: 'registration-office',
                    content: [
                        {
                            id: 'default',
                            type: 'inline',
                            html: 'Stop trying to speedrun the simulation!! You need to complete the first quest!'
                        },
                    ],
                },
            ],
        };
    }

    else if (q2IsActive && !hasReceipt)
        return {
            version: 1,
            components: [
                {
                    type: 'building',
                    id: 'registration-office',
                    content: [
                        {
                            id: 'default',
                            type: 'inline',
                            html: 'To register please handover your Acceptance Letter and proof of identification.',
                            buttons: [{ text: 'Register', type: 'action', action: craft, disabled: !canCraft }]
                        },
                    ],
                },
            ],
        };

    else {
        return {
            version: 1,
            components: [
                {
                    type: 'building',
                    id: 'registration-office',
                    content: [
                        {
                            id: 'default',
                            type: 'inline',
                            html: 'You\'re a registered user. The creation of your Registration Receipt required the destruction of your ID and letter'
                        },
                    ],
                },
            ],
        };
    }
}


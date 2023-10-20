import ds from 'downstream';

export default function update({ selected, world }) {


    const { tiles, mobileUnit } = selected || {};
    const selectedTile = tiles && tiles.length === 1 ? tiles[0] : undefined;
    const selectedBuilding = selectedTile?.building;
    const selectedUnit = mobileUnit;



    //Show this if there is no selected engineer OR the engineer is not adjacent to the building's tile
    if (!selectedUnit) {
        return {
            version: 1,
            components: [
                {
                    type: 'building',
                    id: 'corrupted-user',
                    content: [
                        {
                            id: 'default',
                            type: 'inline',
                            html: 'You have a feeling that now is not the right time to alert the Corrupted User to your presence'
                        }
                    ]
                },
            ],
        };
    }


    //Look for a rubber duck in their bags
    var hasBoringDisguise = false
    for (var j = 0; j < selectedUnit.bags.length; j++) {
        for (var i = 0; i < 4; i++) {
            if (selectedUnit.bags[j].bag.slots[i]) {
                var slot = selectedUnit.bags[j].bag.slots[i];

                if (slot.item) {
                    console.log(j + ":" + i + " = " + slot.item.id + " x " + slot.balance);
                    if (slot.item.id === '0x6a7a67f0a50379fc00000000000000190000001900000019' && slot.balance >= 1) {
                        hasBoringDisguise = true;
                    }
                }
            }
        }
    }


    // fetch the expected inputs item kinds
    const requiredInputs = selectedBuilding?.kind?.inputs || [];
    const want0 = requiredInputs.find(inp => inp.key == 0);
    const want1 = requiredInputs.find(inp => inp.key == 1);
    const want2 = requiredInputs.find(inp => inp.key == 2);

    // fetch what is currently in the input slots
    const inputSlots = selectedBuilding?.bags.find(b => b.key == 0).bag?.slots || [];
    const got0 = inputSlots?.find(slot => slot.key == 0);
    const got1 = inputSlots?.find(slot => slot.key == 1);
    const got2 = inputSlots?.find(slot => slot.key == 2);

    // fetch our output item details
    const expectedOutputs = selectedBuilding?.kind?.outputs || [];
    const out0 = expectedOutputs?.find(slot => slot.key == 0);

    // try to detect if the input slots contain enough stuff to craft
    const canCraft = selectedUnit
        && want0 && got0 && want0.balance == got0.balance
        && want1 && got1 && want1.balance == got1.balance
        && want2 && got2 && want2.balance == got2.balance;

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
    };

    //Show this if there's a boring disguise
    if (hasBoringDisguise) {
        return {
            version: 1,
            components: [
                {
                    type: 'building',
                    id: 'corrupted-user',
                    content: [
                        {
                            id: 'default',
                            type: 'inline',
                            html: 'With your disguise equipped the Corrupted User listens to your request.<br>However they are unwilling to relinquish the Microchip for free',
                            buttons: [{ text: 'It\'s a deal!', type: 'action', action: craft, disabled: !canCraft }],
                        },
                    ],
                },
            ],
        };
    }
    else {
        return {
            version: 1,
            components: [
                {
                    type: 'building',
                    id: 'corrupted-user',
                    content: [
                        {
                            id: 'default',
                            type: 'inline',
                            html: 'You have a feeling that now is not the right time to alert the Corrupted User to your presence',
                        },
                    ],
                },
            ],
        };
    }
}


import ds from 'downstream';

export default function update({ selected, world }) {

    //Function to test the distance between two tiles
    function distance(a, b) {
        return (
            (Math.abs(Number(BigInt.asIntN(16, a.coords[1])) - Number(BigInt.asIntN(16, b.coords[1]))) +
                Math.abs(Number(BigInt.asIntN(16, a.coords[2])) - Number(BigInt.asIntN(16, b.coords[2]))) +
                Math.abs(Number(BigInt.asIntN(16, a.coords[3])) - Number(BigInt.asIntN(16, b.coords[3])))) /
            2
        );
    }

    const { tiles, mobileUnit } = selected || {};
    const selectedTile = tiles && tiles.length === 1 ? tiles[0] : undefined;
    const selectedBuilding = selectedTile?.building;
    const selectedUnit = mobileUnit;


    //Not using this at the moment
    var engineerDistance = 0;
    if (selectedUnit) {
        engineerDistance = distance(selectedUnit.nextLocation.tile, selectedTile);
    }


    //Show this if there is no selected engineer OR the engineer is not adjacent to the building's tile
    if (!selectedUnit) {
        return {
            version: 1,
            components: [
                {
                    type: 'building',
                    id: 'control-tower',
                    content: [
                        {
                            id: 'default',
                            type: 'inline',
                            html: `The Control Tower towers above the world it controls`
                        }
                    ]
                },
            ],
        };
    }


    //Look for a user license in their bags
    var hasUserLicense = false
    for (var j = 0; j < selectedUnit.bags.length; j++) {
        for (var i = 0; i < 4; i++) {
            if (selectedUnit.bags[j].bag.slots[i]) {
                var slot = selectedUnit.bags[j].bag.slots[i];

                if (slot.item && slot.item.id === 'User License' && slot.balance >= 1) {
                    hasUserLicense = true;
                }
            }
        }
    }

    //Need to hook this up
    var hasQuest2 = false;

    //If quest 2 isn't active or completed
    if (!hasUserLicense && !hasQuest2) {
        return {
            version: 1,
            components: [
                {
                    type: 'building',
                    id: 'control-tower',
                    content: [
                        {
                            id: 'default',
                            type: 'inline',
                            html: 'This should show when the player hasn\'t done quest 2 yet.',
                            buttons: [{ text: 'Register User', type: 'action', action: craft, disabled: true }]
                        }
                    ],
                },
            ],
        };
    }

    //Show this if quest 2 is active
    if (!hasUserLicense && hasQuest2) {
        return {
            version: 1,
            components: [
                {
                    type: 'building',
                    id: 'control-tower',
                    content: [
                        {
                            id: 'default',
                            type: 'inline',
                            html: 'Registration Error! Please collect valid User License',
                            buttons: [{ text: 'Register User', type: 'action', action: craft, disabled: true }]
                        }
                    ],
                },
            ],
        };
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

        ds.log('The hermit cuts off his hand and gives it to you.');
    };

    //Show this if there's a rubber duck
    if (hasRubberDuck) {
        return {
            version: 1,
            components: [
                {
                    type: 'building',
                    id: 'crazy-hermit',
                    content: [
                        {
                            id: 'default',
                            type: 'inline',
                            html: 'The crazy hermit looks in wonder at your rubber duck. "GIVE GREEN GOO?" he asks. He holds his hand out as if to offer a trade.',
                            buttons: [{ text: 'It\'s a deal!', type: 'action', action: craft, disabled: !canCraft }],
                        },
                    ],
                },
            ],
        };
    }
}


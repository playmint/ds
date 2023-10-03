import ds from 'downstream';



export default function update({ selected, world }) {

    var hasQ1Active = true;
    var hasQ2Active = false;
    var hasQ3Active = false;
    var hasQ4Active = false;
    var hasQ7AActive = false;


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


    const placeholder = () => {
        hasQ2Active = true;
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
    //var hasQuest2Active = false;
    //var hasQuest2Completed = false;

    //If quest 2 isn't active or completed
    if (hasQ1Active && !hasQ2Active) {
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
                            html: 'Appears before has collected quest 2.',
                            buttons: [{ text: 'Register User', type: 'action', action: placeholder, disabled: false }]
                        }
                    ],
                },
            ],
        };
    }

    //Show this if quest 2 is active
    if (hasQuest2Active) {
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
                            buttons: [{ text: 'Register User', type: 'action', action: placeholder, disabled: true }]
                        }
                    ],
                },
            ],
        };
    }

    //Show this if quest 3 is active
    if (hasQ3Active) {
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
                            html: 'User identified as a total N00b. Please accept newbie quests and level up A.S.A.P.',
                            buttons: [{ text: 'Accept Orientation Quest', type: 'action', action: placeholder, disabled: !hasQ4Active },
                                      { text: 'Accept Creation Quest', type: 'action', action: placeholder, disabled: !hasQ7AActive }]
                        }
                    ],
                },
            ],
        };
    }
}


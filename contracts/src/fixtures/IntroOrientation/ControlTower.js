import ds from 'downstream';

let questStage = 0;

export default async function update({ selected, world }) {

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
        questStage++;
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
                            html: `Select your unit to interact with a building`
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


    //If quest 2 isn't active or completed
    if (questStage === 0) {
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
                            html: 'Appears before has collected quest 2',
                            buttons: [{ text: 'Register User', type: 'action', action: placeholder, disabled: false }]
                        }
                    ],
                },
            ],
        };
    }

    //Show this if quest 2 is active
    else if (questStage === 1) {
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
                            buttons: [{ text: 'Register User', type: 'action', action: placeholder, disabled: true },
                                        { text: 'Advance Quest', type: 'action', action: placeholder, disabled: false }] //placeholder
                        }
                    ],
                },
            ],
        };
    }

    //Show this if quest 3 is active
    else if (questStage >= 2 && questStage <= 4) {
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
                            buttons: [{ text: 'Accept Orientation Quest', type: 'action', action: placeholder, disabled: questStage > 2 },
                                { text: 'Accept Creation Quest', type: 'action', action: placeholder, disabled: questStage > 3 },
                                { text: 'Advance Quest', type: 'action', action: placeholder, disabled: questStage < 4 } //Placeholder
                            ]
                        }
                    ],
                },
            ],
        };
    }

    else if (questStage >= 5 && questStage <= 7) {
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
                            html: 'Simulation abnormalies have been detected. Please accept normalisation assignments.',
                            buttons: [{ text: 'Accept Paperclip Maximiser Quest', type: 'action', action: placeholder, disabled: questStage > 5 },
                                { text: 'Accept Corrupted User Quest', type: 'action', action: placeholder, disabled: questStage > 6 },
                                { text: 'Advance Quest', type: 'action', action: placeholder, disabled: questStage < 7 } //Placeholder
                            ]
                        }
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
                    id: 'control-tower',
                    content: [
                        {
                            id: 'default',
                            type: 'inline',
                            html: 'No quest are available at this time'
                        }
                    ],
                },
            ],
        };
    }
}


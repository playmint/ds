import ds from "downstream";

let questStage = 0;

export default async function update({ selected, world }) {
    const { tiles, mobileUnit } = selected || {};
    const selectedTile = tiles && tiles.length === 1 ? tiles[0] : undefined;
    const selectedBuilding = selectedTile?.building;
    const selectedUnit = mobileUnit;

    const placeholder = () => {
        questStage++;
    };

    //Show this if there is no selected unit
    if (!selectedUnit) {
        return {
            version: 1,
            components: [
                {
                    type: "building",
                    id: "control-tower",
                    content: [
                        {
                            id: "default",
                            type: "inline",
                            html: `Select your unit and stand next to the building to interact with it`,
                        },
                    ],
                },
            ],
        };
    }

    //If quest 2 isn't active or completed
    if (questStage === 0) {
        return {
            version: 1,
            components: [
                {
                    type: "building",
                    id: "control-tower",
                    content: [
                        {
                            id: "default",
                            type: "inline",
                            html: "M.O.R.T.O.N. welcomes you to Hexwood, whilst wondering who you are. Please verify your credentials.",
                            buttons: [
                                {
                                    text: "Verify Credentials",
                                    type: "action",
                                    action: () => {
                                        ds.sendQuestMessage(
                                            "verifyCredentials",
                                        );
                                    },
                                    disabled: false,
                                },
                            ],
                        },
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
                    type: "building",
                    id: "control-tower",
                    content: [
                        {
                            id: "default",
                            type: "inline",
                            html: "Registration Error! Please collect valid User License",
                            buttons: [
                                {
                                    text: "Register User",
                                    type: "action",
                                    action: placeholder,
                                    disabled: true,
                                },
                                {
                                    text: "Advance Quest",
                                    type: "action",
                                    action: placeholder,
                                    disabled: false,
                                },
                            ], //placeholder
                        },
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
                    type: "building",
                    id: "control-tower",
                    content: [
                        {
                            id: "default",
                            type: "inline",
                            html: 'User identified as with status: "Newb". Please accept newbie quests and level up A.S.A.P.',
                            buttons: [
                                {
                                    text: "Accept Orientation Quest",
                                    type: "action",
                                    action: placeholder,
                                    disabled: questStage > 2,
                                },
                                {
                                    text: "Accept Creation Quest",
                                    type: "action",
                                    action: placeholder,
                                    disabled: questStage > 3,
                                },
                                {
                                    text: "Advance Quest",
                                    type: "action",
                                    action: placeholder,
                                    disabled: questStage < 4,
                                }, //Placeholder
                            ],
                        },
                    ],
                },
            ],
        };
    } else if (questStage >= 5 && questStage <= 7) {
        return {
            version: 1,
            components: [
                {
                    type: "building",
                    id: "control-tower",
                    content: [
                        {
                            id: "default",
                            type: "inline",
                            html: "Simulation abnormalies have been detected. Please accept normalisation assignments.",
                            buttons: [
                                {
                                    text: "Accept Paperclip Maximiser Quest",
                                    type: "action",
                                    action: placeholder,
                                    disabled: questStage > 5,
                                },
                                {
                                    text: "Accept Corrupted User Quest",
                                    type: "action",
                                    action: placeholder,
                                    disabled: questStage > 6,
                                },
                                {
                                    text: "Advance Quest",
                                    type: "action",
                                    action: placeholder,
                                    disabled: questStage < 7,
                                }, //Placeholder
                            ],
                        },
                    ],
                },
            ],
        };
    } else {
        return {
            version: 1,
            components: [
                {
                    type: "building",
                    id: "control-tower",
                    content: [
                        {
                            id: "default",
                            type: "inline",
                            html: "No quest are available at this time",
                        },
                    ],
                },
            ],
        };
    }
}

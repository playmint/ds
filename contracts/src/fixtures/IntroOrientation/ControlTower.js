
import ds from "downstream";

let towerState = 0;

const QUEST_ACCEPTED = 1;
const QUEST_COMPLETED = 2;

// const QUEST_0 = "Report to Control";
const QUEST_1 = "Verification Error";
const QUEST_2 = "Report to Control (again!)";
const QUEST_3 = "Orientation";
const QUEST_4 = "Creation";
const QUEST_5 = "Paperclip Maximiser";
const QUEST_6 = "Corrupted User";

export default async function update({ selected, player }) {
    const { tiles, mobileUnit } = selected || {};
    const selectedTile = tiles && tiles.length === 1 ? tiles[0] : undefined;
    const selectedBuilding = selectedTile?.building;
    const selectedUnit = mobileUnit;
    const quests = player.quests;

    // Have to use encode function call
    // const encodeQuestID = ({ name }) => {
    //     const id = BigInt.asUintN(64, BigInt(keccak256UTF8(`quest/${name}`)));
    //     return solidityPacked(['bytes4', 'uint32', 'uint64', 'uint64'], [NodeSelectors.Quest, 0, 0, id]);
    // };

    const getNextQuestNum = () => {
        const questNum = quests.reduce(
            (qNum, q) => (q.key > qNum ? q.key : qNum),
            -1,
        );
        return questNum + 1;
    };

    const areAllQuestsCompleted = (questNames) => {
        const completedQuests = quests.filter(
            (q) =>
                questNames.includes(q.node.name.value) &&
                q.status == QUEST_COMPLETED,
        );

        return completedQuests.length == questNames.length;
    };

    const findQuestByName = (questName) => {
        return quests.find((q) => q.node.name.value == questName);
    };

    // TODO: use name as param and encode the questID
    const acceptQuest = (questId) => {
        const questNum = getNextQuestNum();
        ds.dispatch({
            name: "ACCEPT_QUEST",
            args: [questId, questNum],
        });
    };

    const acceptMultipleQuests = (questIds) => {
        var questNum = getNextQuestNum();
        for (var i = 0; i < questIds.length; i++) {
            ds.dispatch({
                name: "ACCEPT_QUEST",
                args: [questIds[i], questNum],

            });
            questNum++;
        }
    };

    const getQuestStage = () => {
        if (!quests) return 0;

        const questRegError = findQuestByName(QUEST_1);
        if (!questRegError && towerState < 1) return 0;

        const questReturn = findQuestByName(QUEST_2);
        if (!questReturn) return 1;
        if (questReturn.status === QUEST_ACCEPTED && towerState < 2) return 2;

        // show newb quests if not complete
        if (!areAllQuestsCompleted([QUEST_3, QUEST_4])) return 3;

        // show advanced quests if not complete
        if (!areAllQuestsCompleted([QUEST_5, QUEST_6])) return 4;

        // out of quests
        return -1;
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

    const questStage = getQuestStage();


    //If quest 2 isn't active or completed
    if (questStage === 0) {

        const failVerification = () => {
            ds.sendQuestMessage("failCredentials");
            ds.log("MESSAGE SENT");
            towerState = 1;
            ds.log("TOWER STATE UPDATED");
        }

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
                            html: "M.O.R.T.O.N. welcomes you to Hexwood, and yet is wondering who you are. Please verify your credentials.",
                            buttons: [
                                {
                                    text: "Verify Credentials",
                                    type: "action",
                                    action: failVerification,
                                    disabled: false,
                                },
                            ],
                        },
                    ],
                },
            ],
        };
    }
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
                            html: "User Credentials cannot be verified.<br>Please resolve this issue at the Registration Office... or delete yourself from this world!"
                        }
                    ],
                },
            ],
        }
    }

    //If quest 2 isn't active or completed
    else if (questStage === 2) {

        const verificationSuccess = () => {
            ds.sendQuestMessage("passCredentials");
            ds.log("MESSAGE SENT");
            towerState = 2;
            ds.log("TOWER STATE UPDATED");
        }

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
                            html: "M.O.R.T.O.N. again welcomes you to Hexwood, and is hoping that this time you can successfully verify your credentials.",
                            buttons: [
                                {
                                    text: "Verify Credentials",
                                    type: "action",
                                    action: verificationSuccess,
                                    disabled: false,
                                },
                            ],
                        },
                    ],
                },
            ],
        };
    }

    else if (questStage === 3) {

        const orientationQuest = findQuestByName(QUEST_3);
        const creationQuest = findQuestByName(QUEST_4);

        const acceptOrientation = () => {
            acceptMultipleQuests([
                "0xadbb33ce000000000000000000000000c533c3b1b9d5856c", //Orientation
                "0xadbb33ce0000000000000000000000001296e6522b8258fd", //Goo Harvesting
                "0xadbb33ce00000000000000000000000065b3cb8a1f5db1f3", //Deletion Preparation
                "0xadbb33ce0000000000000000000000009d39a8f0c10e1ee7"]); //Deletion Dury
        }

        var orientationButton = {
            text: "Accept Orientation Quest",
            type: "action",
            action: acceptOrientation,
            disabled: false
        };

        var creationButton = {
            text: "Accept Creation Quest",
            type: "action",
            action: () => {
                acceptQuest(
                    "0xadbb33ce000000000000000000000000de3bb0a48fe15c39",
                );
            },
            disabled: false
        };


        var htmlString = "";
        var buttons;
        if (!orientationQuest && !creationQuest) {
            htmlString = "Two quests are available for users of your minimal skill level.<br>Please accept one to improve your simulation competency";
            buttons = [orientationButton, creationButton];
        }
        else if (!orientationQuest) {
            htmlString = "The Orientation quest is recommended for your skill level.<br>Acceptance and completion will improve user ability within the simulation";
            buttons = [orientationButton];
        }
        else if (!creationQuest) {
            htmlString = "The Creation quest is recommended for your skill level.<br>Acceptance and completion will show user's ability to compose improvements to the simulation";
            buttons = [creationButton];
        }
        else {
            html = "No quests are available at this time";
        }


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
                            html: htmlString,
                            buttons: buttons,
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

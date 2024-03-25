import ds from 'downstream';


export default async function update({ selected, world, player }) {


    //const { tiles, mobileUnit } = selected || {};
    //const selectedTile = tiles && tiles.length === 1 ? tiles[0] : undefined;
    //const selectedBuilding = selectedTile?.building;
    //const selectedUnit = mobileUnit;
    const quests = player?.quests || [];

    const getNextQuestNum = () => {
        const questNum = quests.reduce(
            (qNum, q) => (q.key > qNum ? q.key : qNum),
            -1,
        );
        return questNum + 1;
    };

    const acceptQuest = (questId) => {
        const questNum = getNextQuestNum();
        ds.dispatch({
            name: "ACCEPT_QUEST",
            args: [questId, questNum],
        });
    };

    const openBuildingCreator = () => {
        ds.sendQuestMessage("createABuildingPage");
    }

    var creationQuestButton = {
        text: "Accept Creation Quest",
        type: "action",
        action: () => {
            acceptQuest(
                "0xadbb33ce000000000000000000000000e5a40d8f48aab41b", //A Squircle-Shaped Hole
            );
        },
        disabled: false
    };

    var buttonList =[];


    const findQuestByName = (questName) => {
        return quests.find((q) => q.node.name.value == questName);
    };

    const QUEST_NAME = "A Squircle-Shaped Hole"
    const squircleQuest = findQuestByName(QUEST_NAME);


    if (!squircleQuest) {
        buttonList.push(creationQuestButton);
    }

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
                        html: `
                            A wealth of information pertaining
                            to the Details of Object Creation is accessible here.
                            <ul style="padding-left: 30px;">
                            <li><a href="/docs/how-to">Docs</a></li>
                            <li><a href="/building-fabricator">Building Fabricator</a></li>
                            </ul>
                        `,
                        buttons: buttonList
                    }
                ],
            },
        ],
    };
}

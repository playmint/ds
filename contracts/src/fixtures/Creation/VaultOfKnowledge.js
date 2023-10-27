import ds from 'downstream';


export default async function update({ selected, world, player }) {


    //const { tiles, mobileUnit } = selected || {};
    //const selectedTile = tiles && tiles.length === 1 ? tiles[0] : undefined;
    //const selectedBuilding = selectedTile?.building;
    //const selectedUnit = mobileUnit;
    const quests = player?.quests || [];

    const squircleQuest = findQuestByName("A Squircle-Shaped Hole");


    const findQuestByName = (questName) => {
        return quests.find((q) => q.node.name.value == questName);
    };

    const openDocs = () => {
        ds.sendQuestMessage("readTheDoc");
        window.open("https://www.playmint.com"); 
    }

    const openBuildingCreator = () => {
        ds.sendQuestMessage("createABuildingPage");
    }

    var docButton = {
        text: "Read the D.O.C.s",
        type: "action",
        action: openDocs,
        disabled: false
    };

    var builderPageButton = { 
        text: 'Create a Building', 
        type: 'action', 
        action: openBuildingCreator, 
        disabled: false 
    }; 

    var creationQuestButton = {
        text: "Accept Creation Quest",
        type: "action",
        action: () => {
            acceptQuest(
                "0xadbb33ce000000000000000000000000a217b97e1de447f5", //A Squircle-Shaped Hole
            );
        },
        disabled: false
    };

    var buttonList;

    if (!squircleQuest)
    {
        buttonList.push(creationQuestButton);
    }

    buttonList.push(docButton);
    buttonList.push(builderPageButton);

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
                        html: 'A wealth of information pertaining to the Details of Object Creation is accessible here',
                        buttons: buttonList
                    }
                ],
            },
        ],
    };
}
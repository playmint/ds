import ds from "downstream";

export default function update({ selected, world, player }) {
    const { tiles, mobileUnit } = selected || {};
    const selectedTile = tiles && tiles.length === 1 ? tiles[0] : undefined;
    const selectedBuilding = (world?.buildings || []).find(
        (b) => selectedTile && b.location?.tile.id === selectedTile.id,
    );
    const selectedUnit = mobileUnit;
    const selectedBuildingBags = selectedBuilding
        ? (world?.bags || []).filter(
              (bag) => bag.equipee?.node.id === selectedBuilding.id,
          )
        : [];
    const inputBag =
        selectedBuilding &&
        selectedBuildingBags.find((bag) => bag.equipee.key === 0);
    const inputSlots = inputBag && inputBag.slots.sort((a, b) => a.key - b.key);
    const quests = player?.quests || [];


    if (!selectedUnit)
    {
        return;
    }
    // fetch the expected inputs item kinds
    const requiredInputs = selectedBuilding?.kind?.inputs || [];

    // fetch our output item details
    const expectedOutputs = selectedBuilding?.kind?.outputs || [];
    const out0 = expectedOutputs?.find((slot) => slot.key == 0);

    // try to detect if the input slots contain enough stuff to craft
    const canCraft =
        selectedUnit &&
        inputSlots &&
        inputSlots.length >= requiredInputs.length &&
        requiredInputs.every(
            (requiredSlot) =>
                inputSlots[requiredSlot.key].item.id == requiredSlot.item.id &&
                inputSlots[requiredSlot.key].balance == requiredSlot.balance,
        );

    const craft = () => {
        if (!selectedUnit) {
            ds.log("no selected engineer");
            return;
        }
        if (!selectedBuilding) {
            ds.log("no selected building");
            return;
        }

        ds.dispatch({
            name: "BUILDING_USE",
            args: [selectedBuilding.id, selectedUnit.id, []],
        });
    };

    const QUEST_ACCEPTED = 1;
    const QUEST_COMPLETED = 2;

    const QUEST_6c = "Fixing The World Constructor";

    const findQuestByName = (questName) => {
        return quests.find((q) => q.node.name.value == questName);
    };

    const getQuestStage = () => {
        if (!quests) return 0;

        const fixingQuest = findQuestByName(QUEST_6c);
        if (!fixingQuest) return 0;
        if (fixingQuest.status != QUEST_COMPLETED) return 0;
        return 1;
    }

    
    const questStage = getQuestStage();

    if (questStage != 1) {
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
    {

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
}


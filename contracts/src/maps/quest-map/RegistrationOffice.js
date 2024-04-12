import ds from 'downstream';

export default function update({ selected, world, player }) {

    const { tiles, mobileUnit } = selected || {};
    const selectedTile = tiles && tiles.length === 1 ? tiles[0] : undefined;
    const selectedBuilding = (world?.buildings || []).find(b => selectedTile && b.location?.tile?.id === selectedTile.id);
    const selectedBuildingBags = selectedBuilding ? (world?.bags || []).filter(bag => bag.equipee?.node.id === selectedBuilding.id) : [];
    const selectedUnit = mobileUnit;
    const selectedUnitBags = selectedUnit ? (world?.bags || []).filter(bag => bag.equipee?.node?.id === selectedUnit.id) : [];
    const quests = player?.quests || [];


    //Show this if there is no selected unit
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
                            html: `Select your unit and stand next to the building to interact with it`
                        }
                    ]
                },
            ],
        };
    }

    const QUEST_ACCEPTED = 1;
    const QUEST_COMPLETED = 2;

    const QUEST_1 = "Verification Error";

    const findQuestByName = (questName) => {
        return quests.find((q) => q.node.name.value == questName);
    };


    //Look for a Registration Receipt in their bags
    var hasReceipt = false
    for (var j = 0; j < selectedUnitBags.length; j++) {
        for (var i = 0; i < 4; i++) {
            if (selectedUnitBags[j].slots[i]) {
                var slot = selectedUnitBags[j].slots[i];

                if (slot.item && slot.item.name.value === 'Registration Receipt' && slot.balance >= 1) {
                    hasReceipt = true;
                }
            }
        }
    }

    const getQuestStage = () => {
        if (!quests) return 0;

        const verificationQuest = findQuestByName(QUEST_1);
        if (!verificationQuest) return 0;
        if (verificationQuest.status === QUEST_ACCEPTED && !hasReceipt) return 1; //Registration receipt check isn't working. Not super important...
        return 2;
    }



    // fetch the expected inputs item kinds
    const requiredInputs = selectedBuilding?.kind?.inputs || [];
    const want0 = requiredInputs.find(inp => inp.key == 0);
    const want1 = requiredInputs.find(inp => inp.key == 1);

    // fetch what is currently in the input slots
    const inputSlots = selectedBuildingBags.find(b => b.equipee.key == 0)?.slots || [];
    const got0 = inputSlots?.find(slot => slot.key == 0);
    const got1 = inputSlots?.find(slot => slot.key == 1);

    // fetch our output item details
    //const expectedOutputs = selectedBuilding?.kind?.outputs || [];
    //const out0 = expectedOutputs?.find(slot => slot.key == 0);
    //const out1 = expectedOutputs?.find(slot => slot.key == 1);

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
    };

    const questStage = getQuestStage();

    if (questStage === 0) {
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
                            html: 'Our bureaucracy demands that you must be instructed to come here, before we can deal with you.'
                        },
                    ],
                },
            ],
        };
    }

    else if (questStage === 1)
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
                            html: "Give me goo and I'll register you. Collect some from other islands if you don't have enough",
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
                            html: 'You are a registered user. The creation of your Registration Receipt required the destruction of your ID and letter'
                        },
                    ],
                },
            ],
        };
    }
}


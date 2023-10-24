import ds from "downstream";

export default function update({ selected, world }) {
    const { tiles, mobileUnit } = selected || {};
    const selectedTile = tiles && tiles.length === 1 ? tiles[0] : undefined;
    const selectedBuilding = (world?.buildings || []).find(b => selectedTile && b.location?.tile.id === selectedTile.id);
    const selectedBuildingBags = selectedBuilding
        ? (world?.bags || []).filter(
              (bag) => bag.equipee?.node.id === selectedBuilding.id,
          )
        : [];
    const inputBag =
        selectedBuilding &&
        selectedBuildingBags.find((bag) => bag.equipee.key === 0);
    const inputSlots = inputBag && inputBag.slots.sort((a, b) => a.key - b.key);

    const selectedUnit = mobileUnit;
    const selectedUnitBags = selectedUnit
        ? (world?.bags || []).filter(
              (bag) => bag.equipee?.node.id === selectedUnit.id,
          )
        : [];

    //Show this if there is no selected engineer OR the engineer is not adjacent to the building's tile
    if (!selectedUnit) {
        return {
            version: 1,
            components: [
                {
                    type: "building",
                    id: "corrupted-user",
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

    //Look for a boring disguise in their bags
    const hasBoringDisguise = selectedUnitBags.some((b) =>
        b.slots.some(
            (s) =>
                s.item &&
                s.item.name.value === "Boring Disguise" &&
                s.balance >= 1,
        ),
    );

    // fetch the expected inputs item kinds
    const requiredInputs =
        selectedBuilding?.kind?.inputs?.sort((a, b) => a.key - b.key) || [];

    const canCraft =
        selectedUnit &&
        inputSlots &&
        inputSlots.length >= requiredInputs.length &&
        requiredInputs.every(
            (requiredSlot) =>
                inputSlots[requiredSlot.key].item.id == requiredSlot.item.id &&
                inputSlots[requiredSlot.key].balance == requiredSlot.balance,
        );

    // fetch our output item details
    const expectedOutputs = selectedBuilding?.kind?.outputs || [];
    const out0 = expectedOutputs?.find((slot) => slot.key == 0);

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

    //Show this if there's a boring disguise
    if (hasBoringDisguise) {
        return {
            version: 1,
            components: [
                {
                    type: "building",
                    id: "corrupted-user",
                    content: [
                        {
                            id: "default",
                            type: "inline",
                            html: "With your disguise equipped the Corrupted User listens to your request.<br>But they are unwilling to relinquish the Microchip for free",
                            buttons: [
                                {
                                    text: "It's a deal!",
                                    type: "action",
                                    action: craft,
                                    disabled: !canCraft,
                                },
                            ],
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

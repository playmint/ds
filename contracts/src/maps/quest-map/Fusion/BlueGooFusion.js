import ds from "downstream";

export default function update({ selected, world }) {
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

        ds.log("Fusion in progress");
    };

    return {
        version: 1,
        components: [
            {
                type: "building",
                id: "blue-goo-fusion",
                content: [
                    {
                        id: "default",
                        type: "inline",
                        buttons: [
                            {
                                text: "Blue my Goo!",
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

import ds from 'dawnseekers';

export default function update({ selected, world }) {

    const { tiles, seeker } = selected || {};
    const selectedTile = tiles && tiles.length === 1 ? tiles[0] : undefined;
    const selectedBuilding = selectedTile?.building;
    const selectedEngineer = seeker;

    // fetch the expected inputs item kinds
    const requiredInputs = selectedBuilding?.kind?.inputs || [];
    const want0 = requiredInputs.find(inp => inp.key == 0);

    // fetch what is currently in the input slots
    const inputSlots = selectedBuilding?.bags.find(b => b.key == 0).bag?.slots || [];
    const got0 = inputSlots?.find(slot => slot.key == 0);

    // fetch our output item details
    const expectedOutputs = selectedBuilding?.kind?.outputs || [];
    const out0 = expectedOutputs?.find(slot => slot.key == 0);

    // try to detect if the input slots contain enough stuff to craft
    const canCraft = selectedEngineer
        && want0 && got0 && want0.balance == got0.balance;

    const craft = () => {
        if (!selectedEngineer) {
            ds.log('no selected engineer');
            return;
        }
        if (!selectedBuilding) {
            ds.log('no selected building');
            return;
        }

        ds.dispatch(
            {
                name: 'BUILDING_USE',
                args: [selectedBuilding.id, selectedEngineer.id, []]
            },
        );

        ds.log('The foulest foul in this foul land!');
    };

    return {
        version: 1,
        components: [
            {
                type: 'building',
                id: 'foul-fiends',
                title: 'Foul Fiends',
                summary: `Our ducks stink. For just 20 Kikis we're basically giving them away!`,
                content: [
                    {
                        id: 'default',
                        type: 'inline',
                        buttons: [{ text: 'One duck good sir!', type: 'action', action: craft, disabled: !canCraft }],
                    },
                ],
            },
        ],
    };
}


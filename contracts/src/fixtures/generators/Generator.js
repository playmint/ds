import ds from 'downstream';

const PU_MULTIPLIER = 100;

export default function update({ selected, world }, block) {

    const { tiles, mobileUnit } = selected || {};
    const selectedTile = tiles && tiles.length === 1 ? tiles[0] : undefined;
    const selectedBuilding = (world?.buildings || []).find(b => selectedTile && b.location?.tile?.id === selectedTile.id);
    const selectedBuildingBags = selectedBuilding ? (world?.bags || []).filter(bag => bag.equipee?.node.id === selectedBuilding.id) : [];
    const selectedUnit = mobileUnit;

    // fetch the expected inputs item kinds
    const requiredInputs = selectedBuilding?.kind?.inputs || [];
    const want0 = requiredInputs.find(inp => inp.key == 0);

    // fetch what is currently in the input slots
    const inputSlots = selectedBuildingBags.find(b => b.equipee.key == 0)?.slots || [];
    const got0 = inputSlots?.find(slot => slot.key == 0);

    // try to detect if the input slots contain enough stuff to craft
    const canBurn = selectedUnit && want0 && got0 && want0.balance > 0;

    // calc available power units
    const lastBurn = selectedBuilding?.timestamp?.blockNum || 0;
    const blocksSinceBurn = block - lastBurn;
    const goldReservoir = selectedBuilding?.gooReservoir.find(res => res.key === 3);
    const lastPUAmount = (goldReservoir?.weight || 0) * PU_MULTIPLIER;
    const numConnectedBuildings = (selectedBuilding?.powersCount || 0) + 1;
    const availablePowerUnits = Math.max(lastPUAmount - (blocksSinceBurn * numConnectedBuildings), 0);

    const action = () => {
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

    const html = `
        <p>Burn fuel to keep the lights on</p>
        <h1 style="font-size: 3rem;">${availablePowerUnits}PU</h1>
        <p>Connected: ${numConnectedBuildings}</p>
    `;

    return {
        version: 1,
        components: [
            {
                type: 'building',
                id: 'genny',
                content: [
                    {
                        id: 'default',
                        type: 'inline',
                        html,
                        buttons: [{ text: 'Burn', type: 'action', action, disabled: !canBurn }]
                    },
                ],
            },
        ],
    }
}


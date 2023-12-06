import ds from 'downstream';

const HEALTH_BAG_KEY = 100;
const HEALTH_SLOT_KEY = 0;

export default async function update({ selected, world }) {
    const { tiles, mobileUnit } = selected || {};
    const selectedTile = tiles && tiles.length === 1 ? tiles[0] : undefined;
    const selectedBuilding = (world?.buildings || []).find(b => selectedTile && b.location?.tile?.id === selectedTile.id);
    const selectedBuildingBags = selectedBuilding ? (world?.bags || []).filter(bag => bag.equipee?.node.id === selectedBuilding.id) : [];
    const healthBag = selectedBuilding && selectedBuildingBags.find(bag => bag.equipee.key === HEALTH_BAG_KEY);
    const healthSlot = healthBag?.slots.find(slot => slot.key === HEALTH_SLOT_KEY);
    const health = healthSlot?.balance || 0;

    return {
        version: 1,
        components: [
            {
                id: 'ui',
                type: 'building',
                content: [
                    {
                        id: 'default',
                        type: 'inline',
                        html: `
                            <p>WARNING: HIGH VOLTAGE</p>
                            <br />
                            <p>health: ${health}%</p>
                            <br />
                        `
                    },
                ],
            },
        ],
    };
}

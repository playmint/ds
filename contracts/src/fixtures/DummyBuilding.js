import ds from 'dawnseekers';

export default function update({ selected }) {
    const { tiles, seeker } = selected || {};
    const selectedTile = tiles && tiles.length === 1 ? tiles[0] : undefined;
    const selectedBuilding = selectedTile && selectedTile.building ? selectedTile.building : undefined;
    const selectedEngineer = seeker;
    const inputBag = selectedBuilding && selectedBuilding.bags.find(b => b.key == 0).bag;
    const canPourDrink = inputBag && inputBag.slots.length == 2 && inputBag.slots.every(slot => slot.balance > 0) && selectedEngineer;

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

        ds.log('Enjoy your drink!');
    };

    return {
        version: 1,
        components: [
            {
                id: 'welcome-hut',
                type: 'building',
                title: 'Welcome Hut',
                summary: `Welcome to Downstream!`,
                content: [
                    {
                        id: 'default',
                        type: 'inline',
                        buttons: [ { text: 'Pour Welcome Drink', type: 'action', action: craft, disabled: !canPourDrink } ],
                        html: `
                            <p>Bring me two Kikis and two Boubas and claim your welcome drink!</p>
                        `
                    },
                ],
            },
        ],
    };
}

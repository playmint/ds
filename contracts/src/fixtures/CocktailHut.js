import ds from 'dawnseekers';

export default function update({ selected }) {
    const { tiles, mobileUnit } = selected || {};
    const selectedTile = tiles && tiles.length === 1 ? tiles[0] : undefined;
    const selectedBuilding = selectedTile && selectedTile.building ? selectedTile.building : undefined;
    const selectedEngineer = mobileUnit;
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
                id: 'cocktail-hut',
                type: 'building',
                title: 'Cocktail Hut',
                summary: `Come relax, chill out, have a drink!`,
                content: [
                    {
                        id: 'default',
                        type: 'inline',
                        buttons: [ { text: 'Pour Cocktail', type: 'action', action: craft, disabled: !canPourDrink } ],
                        html: `
                            <p>We supply the best drinks in Hexwood!</p>
                        `
                    },
                ],
            },
        ],
    };
}

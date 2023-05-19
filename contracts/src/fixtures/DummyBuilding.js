import ds from 'dawnseekers';

export default function update({ selected }) {
    const { tiles, seeker } = selected || {};
    const selectedTile = tiles && tiles.length === 1 ? tiles[0] : undefined;
    const selectedBuilding = selectedTile && selectedTile.building ? selectedTile.building : undefined;
    const selectedEngineer = seeker;

    const sayHello = () => {
    };

    const craft = () => {
        if (!selectedEngineer) {
            ds.log('no selected engineer');
            return;
        }
        if (!selectedBuilding) {
            ds.log('no selected building');
            return;
        }
        if (!selectedEngineer.bags[1] || !selectedEngineer.bags[1].bag) {
            ds.log('no output bag found');
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
                        buttons: [
                            { text: 'Claim Welcome Drink', type: 'action', action: craft }
                        ],
                        html: `
                            <p>Bring me two Kikis and two Boubas and claim your welcome drink!</p>
                            <br/>
                            <p>You can find items in bags around the map. Scout undiscovered tiles to reveal more bags.<p>
                            <br/>
                            <small>There is a limit of one drink per Engineer</small>
                        `
                    },
                ],
            },
        ],
    };
}

import ds from 'downstream';

let numSips = 0;

export default async function update({ selected }) {
    const { mobileUnit } = selected || {};

    const action = () => {
        // ds.dispatch(
        //     {
        //         name: 'BUILDING_USE',
        //         args: [selectedBuilding.id, selectedEngineer.id, []]
        //     },
        // );
        numSips++;
        ds.log('Sipped!');
    };

    return {
        version: 1,
        components: [
            {
                id: 'cocktail',
                type: 'item',
                content: [
                    {
                        id: 'default',
                        type: 'inline',
                        html: `
                            <p>Cocktail sips: ${numSips}</p>
                        `,
                        buttons: [
                            {
                                text: 'Sip',
                                type: 'action',
                                action,
                            },
                        ],
                    },
                ],
            },
        ],
    };
}

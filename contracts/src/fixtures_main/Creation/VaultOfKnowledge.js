import ds from 'downstream';


export default async function update({ selected, world }) {


    //const { tiles, mobileUnit } = selected || {};
    //const selectedTile = tiles && tiles.length === 1 ? tiles[0] : undefined;
    //const selectedBuilding = selectedTile?.building;
    //const selectedUnit = mobileUnit;



    const placeholder = () => {
       //Does nothing
    }

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
                        html: 'A wealth of information pertaining to the Details of Object Creation is accessible here',
                        buttons: [{ text: 'Read the D.O.C.s', type: 'action', action: placeholder, disabled: false }, //This should take players to the docs
                            { text: 'Create a Building', type: 'action', action: placeholder, disabled: false }] //This should take players to the builder creation page
                    }
                ],
            },
        ],
    };
}
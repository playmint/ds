import ds from 'dawnseekers';

export default function update({ selected, world }) {

    const { tiles, mobileUnit } = selected || {};
    const selectedTile = tiles && tiles.length === 1 ? tiles[0] : undefined;


    return {
        version: 1,
        components: [
            {
                type: 'building',
                id: 'mecha-kaiju',
                title: 'Mecha-Kaiju',
                summary: "It's a huge robotoic reptile thing.  \n Probably destroyed Japan in the before-times.",
                content: [
                    {
                        id: 'default',
                        type: 'inline',
                    },
                ],
            },
        ],
    };
}


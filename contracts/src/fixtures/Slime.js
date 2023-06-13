import ds from 'dawnseekers';

export default function update({ selected, world }) {

    const { tiles, seeker } = selected || {};
    const selectedTile = tiles && tiles.length === 1 ? tiles[0] : undefined;


    return {
        version: 1,
        components: [
            {
                type: 'building',
                id: 'slime',
                title: 'Slime',
                summary: "Everyone knows that Slimes (or rats!) are the starter enemy in a game",
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


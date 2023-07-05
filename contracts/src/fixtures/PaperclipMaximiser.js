import ds from 'dawnseekers';

export default function update({ selected, world }) {

    const { tiles, seeker } = selected || {};
    const selectedTile = tiles && tiles.length === 1 ? tiles[0] : undefined;


    return {
        version: 1,
        components: [
            {
                type: 'building',
                id: 'paperclip-maximiser',
                title: 'Paperclip Maximiser',
                summary: "This AI has gone rogue and is turning all the goo it can find into paperclips. You have to kill it!",
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


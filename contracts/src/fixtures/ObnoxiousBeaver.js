import ds from 'dawnseekers';

export default function update({ selected, world }) {

    const { tiles, seeker } = selected || {};
    const selectedTile = tiles && tiles.length === 1 ? tiles[0] : undefined;


    return {
        version: 1,
        components: [
            {
                type: 'building',
                id: 'obnoxious-beaver',
                title: 'Obnoxious Beaver',
                summary: "\"Screw you hippy!\" \n Can I suggest you kill this fiend?",
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


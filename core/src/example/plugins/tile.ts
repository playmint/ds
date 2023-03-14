export default `

import ds from 'dawnseekers';

export default function update(state) {
    const seeker = state.ui.selection.seeker;
    const tile = state.ui.selection.tiles.length == 1 ? state.ui.selection.tiles[0] : undefined;
    const setSeekerName = () => {};
    const moveSeeker = () => {
        if (!seeker || !tile) {
            return;
        }
        const { q, r, s } = tile.coords;
        ds.log('plugin says: moving seeker', { seeker: seeker.key, q, r, s });
        ds.dispatch('MOVE_SEEKER', seeker.key, q, r, s);
    };
    // ds.log('bad'); // not allowed
    return {
        version: 1,
        components: [
            {
                id: 'my-tile-component',
                type: 'tile',
                title: 'Tile Info',
                summary: 'summary',
                content: [
                    {
                        id: 'default',
                        type: 'inline',
                        buttons: seeker ? [{ text: 'move', type: 'action', action: moveSeeker }] : [],
                    },
                ],
            },
            {
                id: 'my-seeker-component',
                type: 'seeker',
                title: 'Seeker '+ (seeker ? seeker.id : 'none'),
                summary: 'Who is this',
                content: [
                    {
                        id: 'default',
                        type: 'inline',
                        html: '<img src="/icons/battle.png" />',
                        buttons: [{ text: 'show', type: 'toggle', content: 'setName' }],
                    },
                    {
                        id: 'setName',
                        type: 'popout',
                        onSubmit: setSeekerName,
                        html: '<input type="text" name="name" />',
                        buttons: [
                            { text: 'cancel', type: 'toggle', content: '' },
                            { text: 'set', type: 'submit', action: setSeekerName },
                        ],
                    },
                ],
            },
        ],
    };
}

`;

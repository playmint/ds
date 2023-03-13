// import { dawnseekers } from 'dawnseekers/plugin';
// import { MOVE_SEEKER } from 'dawnseekers/actions';

export default function update({ selected }) {
    const moveSeeker = async () => {
        dawnseekers.dispatch([MOVE_SEEKER(selected.seeker.id, selected.tile.id)]);
    };

    const setSeekerName = async (values) => {
        try {
            dawnseekers.dispatch([SEEKER_SET_NAME(selected.seeker.id, values.name)]);
        } catch (e) {
            dawnseekers.log('failed to set seeker name: ${e}');
        }
    };

    return {
        version: 1,
        components: [
            {
                id: 'my-tile-component',
                type: 'tile',
                title: 'Tile Info',
                summary: `coords: ${tile.coords.q}, ${tile.coords.r}, ${tile.coords.s}`,
                content: [
                    {
                        id: 'default',
                        type: 'inline',
                        buttons: [{ text: 'move', type: 'action', action: moveSeeker }],
                    },
                ],
            },
            {
                id: 'my-seeker-component',
                type: 'seeker',
                title: 'Seeker Name',
                summary: 'Who is this',
                content: [
                    {
                        id: 'default',
                        type: 'inline',
                        html: selected.seeker ? '<img src="/a/pic/of/seeker/face.png" />' : '',
                        buttons: [{ text: 'show', type: 'toggle', content: 'setName' }],
                    },
                    {
                        id: 'setName',
                        type: 'popout',
                        onSubmit: setSeekerName,
                        html: `<input type="text" name="name" />`,
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

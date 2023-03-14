/** @format */

import { PluginTrust, PluginType, PluginConfig } from '@core';

const src = `

import ds from 'dawnseekers';

export default function update(state) {
    const seeker = state.ui.selection.seeker;
    const tile = state.ui.selection.tiles.length == 1 ? state.ui.selection.tiles[0] : undefined;

    const moveSeeker = () => {
        if (!seeker || !tile) {
            return;
        }
        const { q, r, s } = tile.coords;
        ds.log('plugin says: moving seeker', { seeker: seeker.key, q, r, s });
        ds.dispatch('MOVE_SEEKER', seeker.key, q, r, s);
    };

    return {
        version: 1,
        components: [
            {
                id: 'my-move-plugin',
                type: 'tile',
                title: 'mover',
                summary: seeker ? 'select a tile to move to' : 'no seeker selected',
                content: [
                    {
                        id: 'default',
                        type: 'inline',
                        buttons: seeker && tile && tile.biome != 0 && tile.id != seeker.location.next.tile.id ? [{ text: 'move', type: 'action', action: moveSeeker }] : [],
                    },
                ],
            },
        ],
    };
}
`;

const plugin: PluginConfig = {
    id: 'move',
    type: PluginType.CORE,
    trust: PluginTrust.TRUSTED,
    src: src
};

export default plugin;

/** @format */

import { PluginConfig, PluginTrust, PluginType } from '@core';

const src = `

import ds from 'dawnseekers';

export default function update(state) {
    const seeker = state.ui.selection.seeker;
    const tile = state.ui.selection.tiles.length == 1 ? state.ui.selection.tiles[0] : undefined;

    const scout = () => {
        if (!seeker || !tile) {
            return;
        }
        const { q, r, s } = tile.coords;
        ds.log('plugin says: scouting...', { seeker: seeker.key, q, r, s });
        ds.dispatch('SCOUT_SEEKER', seeker.key, q, r, s);
    };

    return {
        version: 1,
        components: [
            {
                id: 'my-scout-plugin',
                type: 'tile',
                title: 'scouter',
                summary: 'select a tile to scout',
                content: [
                    {
                        id: 'default',
                        type: 'inline',
                        buttons: seeker && tile && tile.biome == 0 ? [{ text: 'scout', type: 'action', action: scout }] : [],
                    },
                ],
            },
        ],
    };
}
`;

const plugin: PluginConfig = {
    id: 'scout',
    type: PluginType.CORE,
    trust: PluginTrust.TRUSTED,
    src: src
};

export default plugin;

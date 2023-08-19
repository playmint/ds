/** @format */

import { PluginTrust, PluginType, PluginConfig } from '@downstream/core';

const src = `

import ds from 'downstream';

export default function update(state) {
    const mobileUnit = state.ui.selection.mobileUnit;
    const tile = state.ui.selection.tiles.length == 1 ? state.ui.selection.tiles[0] : undefined;

    const moveMobileUnit = () => {
        if (!mobileUnit || !tile) {
            return;
        }
        const { q, r, s } = tile.coords;
        ds.log('plugin says: moving mobileUnit', { mobileUnit: mobileUnit.key, q, r, s });
        ds.dispatch({name 'MOVE_MOBILE_UNIT', args: [mobileUnit.key, q, r, s]});
    };

    return {
        version: 1,
        components: [
            {
                id: 'my-move-plugin',
                type: 'tile',
                title: 'mover',
                summary: mobileUnit ? 'select a tile to move to' : 'no unit selected',
                content: [
                    {
                        id: 'default',
                        type: 'inline',
                        buttons: mobileUnit && tile && tile.biome != 0 && tile.id != mobileUnit.location.next.tile.id ? [{ text: 'move', type: 'action', action: moveMobileUnit }] : [],
                    },
                ],
            },
        ],
    };
}
`;

const plugin: PluginConfig = {
    name: 'move',
    id: 'move',
    hash: 'move',
    type: PluginType.CORE,
    trust: PluginTrust.TRUSTED,
    src: src,
};

export default plugin;

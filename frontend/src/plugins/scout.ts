/** @format */

import { PluginConfig, PluginTrust, PluginType } from '@downstream/core';

const src = `

import ds from 'downstream';

export default function update({selected}) {
    const mobileUnit = selected.mobileUnit;
    const tile = selected.tiles && selected.tiles.length == 1 ? selected.tiles[0] : undefined;

    const scout = () => {
        if (!mobileUnit || !tile) {
            return;
        }
        const [ _z, q, r, s ] = tile.coords;
        ds.log('plugin says: scouting...', q, r, s);
        ds.dispatch({name: 'SCOUT_MOBILE_UNIT', args: [mobileUnit.key, q, r, s]});
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
                        buttons: mobileUnit && tile && tile.biome == 0 ? [{ text: 'scout', type: 'action', action: scout }] : [],
                    },
                ],
            },
        ],
    };
}
`;

const plugin: PluginConfig = {
    name: 'scout',
    id: 'scout',
    hash: 'scout',
    type: PluginType.CORE,
    trust: PluginTrust.TRUSTED,
    src: src,
};

export default plugin;

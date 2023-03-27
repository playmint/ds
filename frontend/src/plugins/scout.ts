/** @format */

import { PluginConfig, PluginTrust, PluginType } from '@dawnseekers/core';

const src = `

import ds from 'dawnseekers';

export default function update({selected}) {
    const seeker = selected.seeker;
    const tile = selected.tiles && selected.tiles.length == 1 ? selected.tiles[0] : undefined;

    const scout = () => {
        if (!seeker || !tile) {
            return;
        }
        const [ _z, q, r, s ] = tile.coords;
        ds.log('plugin says: scouting...', q, r, s);
        ds.dispatch({name: 'SCOUT_SEEKER', args: [seeker.key, q, r, s]});
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
    name: 'scout',
    id: 'scout',
    hash: 'scout',
    type: PluginType.CORE,
    trust: PluginTrust.TRUSTED,
    src: src
};

export default plugin;

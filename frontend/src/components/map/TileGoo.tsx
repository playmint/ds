import { GOO_SMALL_THRESH, getGooColor, getGooSize, getTileHeight } from '@app/helpers/tile';
import { UnityComponentProps, useUnityComponentManager } from '@app/hooks/use-unity-component-manager';
import { WorldTileFragment, getCoords } from '@downstream/core';
import { memo, useMemo } from 'react';

export interface TileGooData {
    q: number;
    r: number;
    s: number;
    height: number;
    color?: 'red' | 'green' | 'blue';
    size?: 'small' | 'big';
}

export const TileGoo = memo(({ id, q, r, s, height, color, size }: UnityComponentProps & TileGooData) => {
    useUnityComponentManager<TileGooData>({
        type: 'TileGooData',
        id,
        data: useMemo(
            () => ({ q, r, s, height, color: color || 'red', size: size || 'small' }),
            [q, r, s, height, color, size]
        ),
    });

    return null;
});

export const TileGoos = memo(({ tiles }: { tiles?: WorldTileFragment[] }) => {
    const tileGooComponents = useMemo(
        () =>
            (tiles || [])
                .filter((t) => {
                    t.atoms.sort((a, b) => b.weight - a.weight);
                    return t.atoms.length > 0 && t.atoms[0].weight >= GOO_SMALL_THRESH;
                })
                .map((t) => {
                    const coords = getCoords(t);

                    return (
                        <TileGoo
                            key={`tileGoo-${t.id}`}
                            id={`tileGoo-${t.id}`}
                            height={getTileHeight(t) + 0.01}
                            color={getGooColor(t.atoms[0])}
                            size={getGooSize(t.atoms[0])}
                            {...coords}
                        />
                    );
                }),
        [tiles]
    );

    return <>{tileGooComponents}</>;
});

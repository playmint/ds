import { UnityComponentProps, useUnityComponentManager } from '@app/hooks/use-unity-component-manager';
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

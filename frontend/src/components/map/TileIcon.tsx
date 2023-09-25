import { UnityComponentProps, useUnityComponentManager } from '@app/hooks/use-unity-component-manager';
import { memo, useMemo } from 'react';

export interface TileIconData {
    q: number;
    r: number;
    s: number;
    height: number;
    icon: string;
}

export const TileIcon = memo(({ id, q, r, s, height, icon }: UnityComponentProps & TileIconData) => {
    useUnityComponentManager<TileIconData>({
        type: 'TileIconData',
        id,
        data: useMemo(() => ({ q, r, s, height, icon }), [q, r, s, height, icon]),
    });

    return null;
});

import { UnityComponentProps, useUnityComponentManager } from '@app/hooks/use-unity-component-manager';
import { memo, useMemo } from 'react';

export interface TileIconData {
    q: number;
    r: number;
    s: number;
    height: number;
    icon: string;
    sendScreenPosition?: boolean;
}

export const TileIcon = memo(
    ({ id, q, r, s, height, icon, sendScreenPosition }: UnityComponentProps & TileIconData) => {
        useUnityComponentManager<TileIconData>({
            type: 'TileIconData',
            id,
            data: useMemo(
                () => ({ q, r, s, height, icon, sendScreenPosition }),
                [q, r, s, height, icon, sendScreenPosition]
            ),
        });

        return null;
    }
);

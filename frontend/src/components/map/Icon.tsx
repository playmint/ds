import { UnityComponentProps, useUnityComponentManager } from '@app/hooks/use-unity-component-manager';
import { memo, useMemo } from 'react';

export interface IconData {
    q: number;
    r: number;
    s: number;
    height: number;
    backgroundColor: string;
    foregroundColor: string;
    image: string;
}

export const Icon = memo(
    ({ id, q, r, s, height, backgroundColor, foregroundColor, image }: UnityComponentProps & IconData) => {
        useUnityComponentManager<IconData>({
            type: 'IconData',
            id,
            data: useMemo(() => ({ q, r, s, height, backgroundColor, foregroundColor, image }), [q, r, s, height, backgroundColor, foregroundColor, image]),
        });

        return null;
    }
);

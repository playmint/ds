import { UnityComponentProps, useUnityComponentManager } from '@app/hooks/use-unity-component-manager';
import { memo, useMemo } from 'react';

export interface LightData {
    q: number;
    r: number;
    s: number;
    height: number;
}

export const Light = memo(({ id, q, r, s, height }: UnityComponentProps & LightData) => {
    useUnityComponentManager<LightData>({
        type: 'LightData',
        id,
        data: useMemo(() => ({ q, r, s, height }), [q, r, s, height]),
    });

    return null;
});

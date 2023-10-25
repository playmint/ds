import { UnityComponentProps, useUnityComponentManager } from '@app/hooks/use-unity-component-manager';
import { memo, useMemo } from 'react';

export interface BuilderCameraData {
    q: number;
    r: number;
    s: number;
    height: number;
}

export const BuilderCamera = memo(({ id, q, r, s, height }: UnityComponentProps & BuilderCameraData) => {
    useUnityComponentManager<BuilderCameraData>({
        type: 'BuilderCameraData',
        id,
        data: useMemo(() => ({ q, r, s, height }), [q, r, s, height]),
    });

    return null;
});

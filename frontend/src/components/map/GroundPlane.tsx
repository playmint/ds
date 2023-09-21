import { UnityComponentProps, useUnityComponentManager } from '@app/hooks/use-unity-component-manager';
import { memo, useMemo } from 'react';

export interface GroundPlaneData {
    height: number;
    color?: string;
}

export const GroundPlane = memo(
    ({ height, color, onPointerEnter, onPointerExit, onPointerClick }: UnityComponentProps & GroundPlaneData) => {
        useUnityComponentManager<GroundPlaneData>({
            type: 'GroundPlaneData',
            data: useMemo(() => ({ height, color }), [height, color]),
            onPointerEnter,
            onPointerExit,
            onPointerClick,
        });

        return null;
    }
);

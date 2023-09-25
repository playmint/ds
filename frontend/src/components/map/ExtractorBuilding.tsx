import { UnityComponentProps, useUnityComponentManager } from '@app/hooks/use-unity-component-manager';
import { memo, useMemo } from 'react';

export interface ExtractorBuildingData {
    q: number;
    r: number;
    s: number;
    height: number;
    rotation: number;
    progress: number;
    color?: string;
    selected?: '' | 'none' | 'highlight' | 'outline';
}

export const ExtractorBuilding = memo(
    ({
        id,
        q,
        r,
        s,
        height,
        color,
        selected,
        rotation,
        progress,
        onPointerEnter,
        onPointerExit,
        onPointerClick,
    }: UnityComponentProps & ExtractorBuildingData) => {
        useUnityComponentManager<ExtractorBuildingData>({
            type: 'ExtractorBuildingData',
            id,
            data: useMemo(
                () => ({ q, r, s, height, color, selected, rotation, progress }),
                [q, r, s, height, color, selected, rotation, progress]
            ),
            onPointerEnter,
            onPointerExit,
            onPointerClick,
        });

        return null;
    }
);

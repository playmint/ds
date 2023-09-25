import { UnityComponentProps, useUnityComponentManager } from '@app/hooks/use-unity-component-manager';
import { memo, useMemo } from 'react';

export interface BlockerBuildingData {
    q: number;
    r: number;
    s: number;
    height: number;
    rotation: number;
    model?: string;
    selected?: '' | 'none' | 'highlight' | 'outline';
}

export const BlockerBuilding = memo(
    ({
        id,
        q,
        r,
        s,
        height,
        model,
        selected,
        rotation,
        onPointerEnter,
        onPointerExit,
        onPointerClick,
    }: UnityComponentProps & BlockerBuildingData) => {
        useUnityComponentManager<BlockerBuildingData>({
            type: 'BlockerBuildingData',
            id,
            data: useMemo(
                () => ({ q, r, s, height, model, selected, rotation }),
                [q, r, s, height, model, selected, rotation]
            ),
            onPointerEnter,
            onPointerExit,
            onPointerClick,
        });

        return null;
    }
);

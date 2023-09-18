import { UnityComponentProps, useUnityComponentManager } from '@app/hooks/use-unity-component-manager';
import { memo, useMemo } from 'react';

export interface FactoryBuildingData {
    q: number;
    r: number;
    s: number;
    height: number;
    model?: string;
    selected?: '' | 'none' | 'highlight' | 'outline';
    rotation?: string;
}

export const FactoryBuilding = memo(
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
    }: UnityComponentProps & FactoryBuildingData) => {
        useUnityComponentManager<FactoryBuildingData>({
            type: 'FactoryBuildingData',
            id,
            data: useMemo(() => ({ q, r, s, height, model, selected, rotation }), [q, r, s, height, model, selected, rotation]),
            onPointerEnter,
            onPointerExit,
            onPointerClick,
        });

        return null;
    }
);

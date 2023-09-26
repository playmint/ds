import { UnityComponentProps, useUnityComponentManager } from '@app/hooks/use-unity-component-manager';
import { memo, useCallback, useMemo, useState } from 'react';

export interface FactoryBuildingData {
    q: number;
    r: number;
    s: number;
    height: number;
    rotation: number;
    model?: string;
    selected?: '' | 'none' | 'highlight' | 'outline';
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
        const [hovered, setHovered] = useState(false);

        onPointerEnter = useCallback(() => setHovered(true), []);
        onPointerExit = useCallback(() => setHovered(false), []);

        selected = selected != 'outline' && hovered ? 'highlight' : selected;

        useUnityComponentManager<FactoryBuildingData>({
            type: 'FactoryBuildingData',
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

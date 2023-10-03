import { UnityComponentProps, useUnityComponentManager } from '@app/hooks/use-unity-component-manager';
import { memo, useCallback, useMemo, useState } from 'react';

export interface BlockerBuildingData {
    q: number;
    r: number;
    s: number;
    height: number;
    rotation: number;
    model?: string;
    selected?: '' | 'none' | 'highlight' | 'outline';
    sendScreenPosition?: boolean;
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
        sendScreenPosition,
        onPointerEnter,
        onPointerExit,
        onPointerClick,
    }: UnityComponentProps & BlockerBuildingData) => {
        const [hovered, setHovered] = useState(false);

        onPointerEnter = useCallback(() => setHovered(true), []);
        onPointerExit = useCallback(() => setHovered(false), []);

        selected = selected != 'outline' && hovered ? 'highlight' : selected;

        useUnityComponentManager<BlockerBuildingData>({
            type: 'BlockerBuildingData',
            id,
            data: useMemo(
                () => ({ q, r, s, height, model, selected, rotation, sendScreenPosition }),
                [q, r, s, height, model, selected, rotation, sendScreenPosition]
            ),
            onPointerEnter,
            onPointerExit,
            onPointerClick,
        });
        return null;
    }
);

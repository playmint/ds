import { UnityComponentProps, useUnityComponentManager } from '@app/hooks/use-unity-component-manager';
import { memo, useCallback, useMemo, useState } from 'react';

export interface MilitaryBuildingData {
    q: number;
    r: number;
    s: number;
    height: number;
    rotation: number;
    model?: string;
    color?: string;
    selected?: '' | 'none' | 'highlight' | 'outline';
    sendScreenPosition?: boolean;
}

export const MilitaryBuilding = memo(
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
    }: UnityComponentProps & MilitaryBuildingData) => {
        const [hovered, setHovered] = useState(false);

        const [bottom, top, color] = model?.split('-') || [];
        const combinedModel = `${bottom || '00'}-${top || '00'}`;

        onPointerEnter = useCallback(() => setHovered(true), []);
        onPointerExit = useCallback(() => setHovered(false), []);

        selected = selected != 'outline' && hovered ? 'highlight' : selected;

        useUnityComponentManager<MilitaryBuildingData>({
            type: 'MilitaryBuildingData',
            id,
            data: useMemo(
                () => ({
                    q,
                    r,
                    s,
                    height,
                    model: combinedModel,
                    selected,
                    rotation,
                    sendScreenPosition,
                    color: color || '0',
                }),
                [q, r, s, height, combinedModel, selected, rotation, sendScreenPosition, color]
            ),
            onPointerEnter,
            onPointerExit,
            onPointerClick,
        });

        return null;
    }
);

import { UnityComponentProps, useUnityComponentManager } from '@app/hooks/use-unity-component-manager';
import { memo, useCallback, useMemo, useState } from 'react';

export interface FactoryBuildingData {
    q: number;
    r: number;
    s: number;
    height: number;
    rotation: number;
    model?: string;
    color?: string;
    selected?: '' | 'none' | 'highlight' | 'outline';
}

export interface LabelProps {
    label?: string;
}

interface ScreenSpacePosition {
    id: string;
    x: number;
    y: number;
    z: number;
    isVisible: boolean;
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
        label,
        rotation,
        onPointerEnter,
        onPointerExit,
        onPointerClick,
    }: UnityComponentProps & FactoryBuildingData & LabelProps) => {
        const [hovered, setHovered] = useState(false);

        const [position, setPosition] = useState<ScreenSpacePosition>();

        const onPositionUpdate = useCallback((id, _type, x, y, z, isVisible) => {
            setPosition({ id, x, y, z, isVisible });
        }, []);

        const [bottom, top, color] = model?.split('-') || [];
        const combinedModel = `${bottom || '00'}-${top || '00'}`;

        onPointerEnter = useCallback(() => setHovered(true), []);
        onPointerExit = useCallback(() => setHovered(false), []);

        selected = selected != 'outline' && hovered ? 'highlight' : selected;

        useUnityComponentManager<FactoryBuildingData>({
            type: 'FactoryBuildingData',
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
                    sendScreenPosition: true,
                    screenPositionHeightOffset: 1,
                    color: color || '0',
                }),
                [q, r, s, height, combinedModel, selected, rotation, color]
            ),
            onPointerEnter,
            onPointerExit,
            onPointerClick,
            onPositionUpdate,
        });

        return (
            <label
                style={{
                    display: label && position?.isVisible ? 'block' : 'none',
                    background: 'black',
                    border: '2px solid white',
                    borderRadius: '16px',
                    color: 'white',
                    fontWeight: 800,
                    padding: '0 1rem',
                    position: 'fixed',
                    left: `calc(${(position?.x || 0) * 100}vw - 4rem)`,
                    bottom: `${(position?.y || 0) * 100}vh`,
                    zIndex: 2,
                }}
            >
                {label}
            </label>
        );
    }
);

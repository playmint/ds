import { UnityComponentProps, useUnityComponentManager } from '@app/hooks/use-unity-component-manager';
import { memo, useCallback, useMemo, useState } from 'react';

interface ScreenSpacePosition {
    id: string;
    x: number;
    y: number;
    z: number;
    isVisible: boolean;
}

export interface GeneratorBuildingData {
    q: number;
    r: number;
    s: number;
    height: number;
    rotation: number;
    color?: string;
    selected?: '' | 'none' | 'highlight' | 'outline';
    powered: boolean;
}

export interface LabelProps {
    label?: string;
}

export interface GeneratorBuildingProps {
    q: number;
    r: number;
    s: number;
    height: number;
    rotation: number;
    color?: string;
    selected?: '' | 'none' | 'highlight' | 'outline';
    powered?: boolean;
}

export const GeneratorBuilding = memo(
    ({
        id,
        q,
        r,
        s,
        height,
        color,
        selected,
        label,
        rotation,
        powered,
        onPointerEnter,
        onPointerExit,
        onPointerClick,
    }: UnityComponentProps & GeneratorBuildingProps & LabelProps) => {
        const [hovered, setHovered] = useState(false);
        const [position, setPosition] = useState<ScreenSpacePosition>();

        const onPositionUpdate = useCallback((id, _type, x, y, z, isVisible) => {
            setPosition({ id, x, y, z, isVisible });
        }, []);

        onPointerEnter = useCallback(() => setHovered(true), []);
        onPointerExit = useCallback(() => setHovered(false), []);

        selected = selected != 'outline' && hovered ? 'highlight' : selected;

        useUnityComponentManager<GeneratorBuildingData>({
            type: 'GeneratorBuildingData',
            id,
            data: useMemo(
                () => ({
                    q,
                    r,
                    s,
                    height,
                    selected,
                    rotation,
                    color: color || '0',
                    progress: 0,
                    powered: typeof powered === 'undefined' ? false : powered,
                    sendScreenPosition: true,
                    screenPositionHeightOffset: 1,
                }),
                [q, r, s, height, color, selected, rotation, powered]
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

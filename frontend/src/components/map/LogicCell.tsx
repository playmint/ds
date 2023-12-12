import { UnityComponentProps, useUnityComponentManager } from '@app/hooks/use-unity-component-manager';
import { memo, useCallback, useMemo, useState } from 'react';
import { FactoryBuildingData } from './FactoryBuilding';

interface ScreenSpacePosition {
    id: string;
    x: number;
    y: number;
    z: number;
    isVisible: boolean;
}

export interface LabelProps {
    label?: string;
}

export interface LogicCellBuildingData {
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

export const LogicCellBuilding = memo(
    ({
        id,
        q,
        r,
        s,
        height,
        model,
        label,
        selected,
        rotation,
        sendScreenPosition,
        onPointerEnter,
        onPointerExit,
        onPointerClick,
    }: UnityComponentProps & LogicCellBuildingData & LabelProps) => {
        const [hovered, setHovered] = useState(false);
        const [position, setPosition] = useState<ScreenSpacePosition>();

        const [bottom, top, color] = model?.split('-') || [];
        const combinedModel = `${bottom || '00'}-${top || '00'}`;

        const onPositionUpdate = useCallback((id, _type, x, y, z, isVisible) => {
            setPosition({ id, x, y, z, isVisible });
        }, []);

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
                    sendScreenPosition,
                    color: color || '0',
                }),
                [q, r, s, height, combinedModel, selected, rotation, sendScreenPosition, color]
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
                    left: `calc(${(position?.x || 0) * 100}vw)`,
                    transform: `translateX(-50%)`,
                    bottom: `${(position?.y || 0) * 100}vh`,
                    zIndex: 2,
                }}
            >
                {label}
            </label>
        );
    }
);

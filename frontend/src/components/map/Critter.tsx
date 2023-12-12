import { UnityComponentProps, useUnityComponentManager } from '@app/hooks/use-unity-component-manager';
import { memo, useCallback, useMemo, useState } from 'react';
import HealthBar from './HealthBar';

export interface CritterData {
    q: number;
    r: number;
    s: number;
    height: number;
    radius: number;
    visible?: boolean;
    rotation: number;
    sendScreenPosition?: boolean;
    screenPositionHeightOffset?: number;
    health: number;
    onUpdatePosition?: (id: string, x: number, y: number, z: number, isVisible: boolean) => void;
}

export const Critter = memo(
    ({
        id,
        q,
        r,
        s,
        height,
        radius,
        rotation,
        visible,
        screenPositionHeightOffset,
        health,
        onPointerClick,
        onUpdatePosition,
    }: UnityComponentProps & CritterData) => {
        const [position, setPosition] = useState({ x: 0, y: 0, z: 0 });
        const [isVisible, setVisible] = useState(false);
        const { x, y, z } = position;

        const onPositionUpdate = useCallback(
            (id?: string, _type?: string, x?: number, y?: number, z?: number, isVisible?: boolean) => {
                if (isVisible !== undefined) {
                    setVisible(isVisible);
                }
                if (
                    x !== undefined &&
                    y !== undefined &&
                    z !== undefined &&
                    id !== undefined &&
                    isVisible !== undefined
                ) {
                    const scale = 1 / (1 + z);
                    const precision = 5;
                    const newPosition = {
                        x: Number(x.toFixed(precision)),
                        y: Number(y.toFixed(precision)),
                        z: Number(scale.toFixed(4)),
                    };
                    setPosition(newPosition);
                    if (onUpdatePosition) {
                        onUpdatePosition(id, newPosition.x, newPosition.y, newPosition.z, isVisible); // Call the callback here
                    }
                }
            },
            [onUpdatePosition]
        );

        useUnityComponentManager<CritterData>({
            type: 'CritterData',
            id,
            data: useMemo(
                () => ({
                    q,
                    r,
                    s,
                    height: typeof height != 'undefined' ? height : 0.6,
                    rotation,
                    radius,
                    sendScreenPosition: true,
                    screenPositionHeightOffset: screenPositionHeightOffset || 0,
                    visible: typeof visible != 'undefined' ? visible : true,
                    position: { x, y, z },
                    isVisible,
                    health,
                }),
                [q, r, s, height, radius, rotation, visible, screenPositionHeightOffset, x, y, z, isVisible, health]
            ),
            onPointerClick,
            onPositionUpdate,
        });

        //const combinedPosition = { x, y, z, isVisible };

        return null;// <HealthBar position={combinedPosition} health={health} />;
    }
);

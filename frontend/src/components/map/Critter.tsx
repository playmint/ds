import { UnityComponentProps, useUnityComponentManager } from '@app/hooks/use-unity-component-manager';
import { memo, useCallback, useMemo, useState } from 'react';

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
        sendScreenPosition,
        screenPositionHeightOffset,
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
                    sendScreenPosition: !!sendScreenPosition,
                    screenPositionHeightOffset: screenPositionHeightOffset || 0,
                    visible: typeof visible != 'undefined' ? visible : true,
                    position: { x, y, z },
                    isVisible,
                }),
                [
                    q,
                    r,
                    s,
                    height,
                    radius,
                    rotation,
                    visible,
                    sendScreenPosition,
                    screenPositionHeightOffset,
                    x,
                    y,
                    z,
                    isVisible,
                ]
            ),
            onPointerClick,
            onPositionUpdate,
        });

        return null;
    }
);

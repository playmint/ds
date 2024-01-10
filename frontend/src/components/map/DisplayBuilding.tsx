import { UnityComponentProps, useUnityComponentManager } from '@app/hooks/use-unity-component-manager';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import Label from './Label';

export interface DisplayBuildingData {
    q: number;
    r: number;
    s: number;
    height: number;
    rotation: number;
    color?: string;
    selected?: '' | 'none' | 'highlight' | 'outline';
    sendScreenPosition: boolean;
    screenPositionHeightOffset: number;
    labelText;
    startTime;
    endTime;
    model?: string;
    onUpdatePosition?: (id: string, x: number, y: number, z: number, isVisible: boolean) => void;
}

export const DisplayBuilding = memo(
    ({
        id,
        q,
        r,
        s,
        height,
        color,
        selected,
        rotation,
        sendScreenPosition,
        screenPositionHeightOffset,
        labelText,
        startTime,
        endTime,
        model,
        onUpdatePosition,
        onPointerEnter,
        onPointerExit,
        onPointerClick,
    }: UnityComponentProps & DisplayBuildingData) => {
        const [hovered, setHovered] = useState(false);
        const [position, setPosition] = useState({ x: 0, y: 0, z: 0 });
        const [isVisible, setVisible] = useState(false);
        const { x, y, z } = position;

        onPointerEnter = useCallback(() => setHovered(true), []);
        onPointerExit = useCallback(() => setHovered(false), []);

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

        selected = selected != 'outline' && hovered ? 'highlight' : selected;

        const calculateTimeLeft = () => {
            const now = new Date();
            if (!startTime) return 600;
            if (now < startTime) {
                return Math.floor((endTime - startTime) / 1000);
            } else if (now > endTime) {
                return 0;
            } else {
                return Math.floor((endTime - Date.now()) / 1000);
            }
        };

        const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

        useEffect(() => {
            const timer = setInterval(() => {
                setTimeLeft(calculateTimeLeft());
            }, 1000);

            return () => clearInterval(timer);
        }, [startTime, endTime]);

        const formatTime = (seconds) => {
            const minutes = Math.floor(seconds / 60);
            seconds = seconds % 60;
            return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        };

        const modifiedStartTime = (Date.now() - startTime) / (endTime - startTime);
        const modifiedLabelText = startTime ? formatTime(timeLeft) : labelText;

        useUnityComponentManager<DisplayBuildingData>({
            type: 'DisplayBuildingData',
            id,
            data: useMemo(
                () => ({
                    q,
                    r,
                    s,
                    height,
                    color,
                    selected,
                    rotation,
                    sendScreenPosition,
                    screenPositionHeightOffset,
                    position: { x, y, z },
                    isVisible,
                    labelText: modifiedLabelText,
                    startTime: modifiedStartTime,
                    endTime,
                    model,
                }),
                [
                    q,
                    r,
                    s,
                    height,
                    color,
                    selected,
                    rotation,
                    sendScreenPosition,
                    screenPositionHeightOffset,
                    x,
                    y,
                    z,
                    isVisible,
                    modifiedLabelText,
                    modifiedStartTime,
                    endTime,
                    model,
                ]
            ),
            onPointerEnter,
            onPointerExit,
            onPointerClick,
            onPositionUpdate,
        });
        return null;
    }
);

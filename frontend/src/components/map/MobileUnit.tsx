import { UnityComponentProps, useUnityComponentManager } from '@app/hooks/use-unity-component-manager';
import { memo, useMemo, useState } from 'react';

// public int q;
// public int r;
// public int s;
// public float height;
// public float progress; // 0 -> 1 percent between prev/next
// public string? selected; // ={none/highlight/outline}
// public bool shared; //  ie sharing with a building
// public bool visible;

export interface MobileUnitData {
    q: number;
    r: number;
    s: number;
    height: number;
    progress: number;
    selected?: 'none' | 'highlight' | 'outline';
    shared: boolean;
    visible: boolean;
    sendScreenPosition?: boolean;
    screenPositionHeightOffset: number;
}

export const MobileUnit = memo(
    ({
        id,
        q,
        r,
        s,
        height,
        progress,
        selected,
        shared,
        visible,
        sendScreenPosition,
        screenPositionHeightOffset,
        onPointerEnter,
        onPointerExit,
        onPointerClick,
        screenPosition,
    }: UnityComponentProps & MobileUnitData) => {
        const [position, setPosition] = useState({ x: 0, y: 0, z: 0 });
        const [isVisible, setVisible] = useState({ isVisible: false });

        const screenPositionHandler = (
            id?: string,
            type?: string,
            x?: number,
            y?: number,
            z?: number,
            isVisible?: boolean
        ) => {
            if (screenPosition && id && type && x && y && z && isVisible !== undefined) {
                screenPosition(id, type, x, y, z, isVisible);
            }
            if (x !== undefined && y !== undefined && z !== undefined) {
                const scale = 1 / (1 + z);
                setPosition({ x, y, z: scale });
            }
            if (isVisible !== undefined) {
                setVisible({ isVisible });
            }
        };

        useUnityComponentManager<MobileUnitData>({
            type: 'MobileUnitData',
            id,
            data: useMemo(
                () => ({
                    q,
                    r,
                    s,
                    height,
                    progress,
                    sendScreenPosition,
                    screenPositionHeightOffset,
                    selected: selected || 'none',
                    shared,
                    visible,
                }),
                [q, r, s, height, progress, selected, shared, visible, sendScreenPosition, screenPositionHeightOffset]
            ),
            onPointerEnter,
            onPointerExit,
            onPointerClick,
            screenPosition: screenPositionHandler,
        });

        if (isVisible.isVisible) {
            return (
                <div
                    style={{
                        position: 'absolute',
                        width: `${550 * position.z}px`,
                        height: `${550 * position.z}px`,
                        left: `${position.x * 100}vw`,
                        bottom: `${position.y * 100}vh`,
                        zIndex: '1',
                        marginLeft: `-${275 * position.z}px`,
                        marginTop: `-${275 * position.z}px`,
                        // other styles for the div, e.g., background color, width, height, etc.
                    }}
                >
                    <img src={'/mobile-unit-yours.png'} style={{ width: '100%', height: '100%' }} alt="unit" />
                </div>
            );
        }

        return null;
    }
);

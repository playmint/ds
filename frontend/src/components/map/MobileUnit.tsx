import { UnityComponentProps, useUnityComponentManager } from '@app/hooks/use-unity-component-manager';
import { memo, useMemo } from 'react';

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
        onPointerEnter,
        onPointerExit,
        onPointerClick,
    }: UnityComponentProps & MobileUnitData) => {
        useUnityComponentManager<MobileUnitData>({
            type: 'MobileUnitData',
            id,
            data: useMemo(
                () => ({ q, r, s, height, progress, selected: selected || 'none', shared, visible }),
                [q, r, s, height, progress, selected, shared, visible]
            ),
            onPointerEnter,
            onPointerExit,
            onPointerClick,
        });

        return null;
    }
);
import { UnityComponentProps, useUnityComponentManager } from '@app/hooks/use-unity-component-manager';
import { memo, useCallback, useMemo, useState } from 'react';

export interface BillboardData {
    q: number;
    r: number;
    s: number;
    height: number;
    rotation?: number;
    url?: string;
    selected?: '' | 'none' | 'highlight' | 'outline';
    sendScreenPosition?: boolean;
}

export const Billboard = memo(
    ({
        id,
        q,
        r,
        s,
        height,
        url,
        selected,
        sendScreenPosition,
        rotation,
        onPointerEnter,
        onPointerExit,
        onPointerClick,
    }: UnityComponentProps & BillboardData) => {
        const [hovered, setHovered] = useState(false);

        onPointerEnter = useCallback(() => setHovered(true), []);
        onPointerExit = useCallback(() => setHovered(false), []);

        selected = selected != 'outline' && hovered ? 'highlight' : selected;

        useUnityComponentManager<BillboardData>({
            type: 'BillboardData',
            id,
            data: useMemo(
                () => ({ q, r, s, height, rotation, url, selected, sendScreenPosition }),
                [q, r, s, height, rotation, url, selected, sendScreenPosition]
            ),
            onPointerEnter,
            onPointerExit,
            onPointerClick,
        });
        return null;
    }
);

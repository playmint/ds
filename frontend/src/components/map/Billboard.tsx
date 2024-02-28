import { UnityComponentProps, useUnityComponentManager } from '@app/hooks/use-unity-component-manager';
import { memo, useCallback, useMemo, useState } from 'react';

export interface BillboardData {
    q: number;
    r: number;
    s: number;
    height: number;
    rotation?: number;
    image?: string;
    model?: string;
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
        image,
        model,
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
                () => ({ q, r, s, height, rotation, image, model, selected, sendScreenPosition }),
                [q, r, s, height, rotation, image, model, selected, sendScreenPosition]
            ),
            onPointerEnter,
            onPointerExit,
            onPointerClick,
        });
        return null;
    }
);

import { UnityComponentProps, useUnityComponentManager } from '@app/hooks/use-unity-component-manager';
import { memo, useMemo } from 'react';

export interface PathData {
    qFrom: number;
    rFrom: number;
    sFrom: number;
    heightFrom: number;
    qTo: number;
    rTo: number;
    sTo: number;
    heightTo: number;
    color?: string;
}

export const Path = memo(
    ({
        id,
        qFrom,
        rFrom,
        sFrom,
        heightFrom,
        qTo,
        rTo,
        sTo,
        heightTo,
        color,
        onPointerEnter,
        onPointerExit,
        onPointerClick,
    }: UnityComponentProps & PathData) => {
        useUnityComponentManager<PathData>({
            type: 'PathData',
            id,
            data: useMemo(
                () => ({
                    qFrom,
                    rFrom,
                    sFrom,
                    heightFrom,
                    qTo,
                    rTo,
                    sTo,
                    heightTo,
                    color: color || '#47E4FF',
                }),
                [qFrom, rFrom, sFrom, heightFrom, qTo, rTo, sTo, heightTo, color]
            ),
            onPointerEnter,
            onPointerExit,
            onPointerClick,
        });

        return null;
    }
);

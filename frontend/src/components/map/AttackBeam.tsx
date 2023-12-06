import { UnityComponentProps, useUnityComponentManager } from '@app/hooks/use-unity-component-manager';
import { memo, useMemo } from 'react';

export interface AttackBeamData {
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

export const AttackBeam = memo(
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
    }: UnityComponentProps & AttackBeamData) => {
        useUnityComponentManager<AttackBeamData>({
            type: 'AttackBeamData',
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

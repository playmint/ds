import { UnityComponentProps, useUnityComponentManager } from '@app/hooks/use-unity-component-manager';
import { memo, useMemo } from 'react';

export interface LabelData {
    q: number;
    r: number;
    s: number;
    height: number;
    text: string;
}

export const Label = memo(
    ({ id, q, r, s, height, text }: UnityComponentProps & LabelData) => {
        useUnityComponentManager<LabelData>({
            type: 'LabelData',
            id,
            data: useMemo(() => ({ q, r, s, height, text }), [q, r, s, height, text]),
        });

        return null;
    }
);

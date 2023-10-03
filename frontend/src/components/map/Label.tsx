import { UnityComponentProps, useUnityComponentManager } from '@app/hooks/use-unity-component-manager';
import { memo, useMemo } from 'react';

export interface LabelData {
    q: number;
    r: number;
    s: number;
    height: number;
    text: string;
    sendScreenPosition?: boolean;
}

export const Label = memo(({ id, q, r, s, height, text, sendScreenPosition }: UnityComponentProps & LabelData) => {
    useUnityComponentManager<LabelData>({
        type: 'LabelData',
        id,
        data: useMemo(
            () => ({ q, r, s, height, text, sendScreenPosition }),
            [q, r, s, height, text, sendScreenPosition]
        ),
    });

    return null;
});

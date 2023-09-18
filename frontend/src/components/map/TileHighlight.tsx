import { UnityComponentProps, useUnityComponentManager } from '@app/hooks/use-unity-component-manager';
import { memo, useMemo } from 'react';

export interface TileHighlightData {
    q: number;
    r: number;
    s: number;
    height: number;
    color: string;
    animation?: 'none' | 'pulse';
    style?: 'flat' | 'gradient' | 'gradient_blue' | 'gradient_outline';
}

export const TileHighlight = memo(
    ({ id, q, r, s, height, color, style, animation }: UnityComponentProps & TileHighlightData) => {
        useUnityComponentManager<TileHighlightData>({
            type: 'TileHighlightData',
            id,
            data: useMemo(
                () => ({ q, r, s, height, color, style: style || 'gradient_outline', animation: animation || 'none' }),
                [q, r, s, height, color, style, animation]
            ),
        });

        return null;
    }
);

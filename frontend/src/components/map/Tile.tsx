import { useUnityMap } from '@app/hooks/use-unity-map';
import { memo, useEffect, useMemo } from 'react';

export interface ComponentMessage {
    id: string; // instance id
    type: string; // component name eg Tile
}

export interface ComponentDataMessage extends ComponentMessage {
    data: string; // json encoded (eg TileData)
}

export interface TileProps {
    id: string;
    q: number;
    r: number;
    s: number;
    color: string;
}

export const Tile = memo(({ id, q, r, s, color }: TileProps) => {
    const { sendMessage } = useUnityMap();
    const ref = useMemo(() => Math.floor(Math.random() * 10000).toString(), []);

    useEffect(() => {
        if (!sendMessage) {
            console.warn('no sendMessage');
            return;
        }
        const data = JSON.stringify({ id, q, r, s, color });
        const msg: ComponentDataMessage = {
            type: 'Tile',
            id: ref,
            data,
        };
        sendMessage('ComponentManager', 'SetComponent', JSON.stringify(msg));
    }, [id, q, r, s, color, sendMessage, ref]);

    useEffect(() => {
        return () => {
            if (!sendMessage) {
                return;
            }
            const msg: ComponentMessage = {
                type: 'Tile',
                id: ref,
            };
            sendMessage('ComponentManager', 'RemoveComponent', JSON.stringify(msg));
        };
    }, [sendMessage, ref]);

    return null;
});

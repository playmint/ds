import { useUnityMap } from '@app/hooks/use-unity-map';
import { memo, useCallback, useEffect, useMemo } from 'react';

export interface ComponentMessage {
    id: string; // instance id
    type: string; // component name eg Tile
}

export interface ComponentDataMessage extends ComponentMessage {
    data: string; // json encoded (eg TileData)
}

export interface TileData {
    id: string;
    q: number;
    r: number;
    s: number;
    height: number;
    color: string;
}

export interface TileProps extends TileData {
    onPointerEnter?: (t: { id: string }) => void;
}

export const Tile = memo(({ onPointerEnter, ...data }: TileProps) => {
    const { sendMessage, addUnityEventListener, removeUnityEventListener } = useUnityMap();
    const ref = useMemo(() => Math.floor(Math.random() * 10000).toString(), []);
    const { id, q, r, s, height, color } = data;

    useEffect(() => {
        const pointerEnterHandler = () => {
            console.log('got', ref);
            if (!onPointerEnter) {
                return;
            }
            onPointerEnter({ id });
        };
        const eventName = `tile_pointer_enter_${ref}`;
        if (!addUnityEventListener) {
            console.log('NO addUnityEventListener', ref, eventName);
            return;
        }
        console.log('listening', ref, eventName);
        addUnityEventListener(eventName, pointerEnterHandler);
        return () => {
            if (!removeUnityEventListener) {
                return;
            }
            console.log('removing', ref, eventName);
            removeUnityEventListener(eventName, pointerEnterHandler);
        };
    }, [addUnityEventListener, removeUnityEventListener, onPointerEnter, ref, id]);

    useEffect(() => {
        if (!sendMessage) {
            console.warn('no sendMessage');
            return;
        }
        const data = JSON.stringify({ id, q, r, s, color, height });
        const msg: ComponentDataMessage = {
            type: 'Tile',
            id: ref,
            data,
        };
        sendMessage('ComponentManager', 'SetComponent', JSON.stringify(msg));
    }, [id, q, r, s, height, color, sendMessage, ref]);

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

// export const withUnityEvents = () => {

//     const pointerExitHandler = useCallback(() => {
//         if (!onPointerExit) {
//             return;
//         }
//         onPointerExit({ id });
//         // console.log('fired pointerexit', id);
//     }, [id, onPointerExit]);

//     const pointerClickHandler = useCallback(() => {
//         if (!onPointerClick) {
//             return;
//         }
//         onPointerClick({ id });
//         // console.log('fired pointerexit', id);
//     }, [id, onPointerClick]);

//     useEffect(() => {
//         const eventName = `tile_pointer_enter_${q}_${r}_${s}`;
//         addUnityEventListener(eventName, pointerEnterHandler);
//         // console.log('listening', eventName);
//         return () => {
//             removeUnityEventListener(eventName, pointerEnterHandler);
//         };
//     }, [addUnityEventListener, removeUnityEventListener, pointerEnterHandler, q, r, s]);

//     useEffect(() => {
//         const eventName = `tile_pointer_exit_${q}_${r}_${s}`;
//         addUnityEventListener(eventName, pointerExitHandler);
//         return () => {
//             removeUnityEventListener(eventName, pointerExitHandler);
//         };
//     }, [addUnityEventListener, removeUnityEventListener, pointerExitHandler, q, r, s]);

//     useEffect(() => {
//         const eventName = `tile_pointer_click_${q}_${r}_${s}`;
//         addUnityEventListener(eventName, pointerClickHandler);
//         return () => {
//             removeUnityEventListener(eventName, pointerClickHandler);
//         };
//     }, [addUnityEventListener, removeUnityEventListener, pointerClickHandler, q, r, s]);

//     return null;
// };

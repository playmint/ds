import { useUnityMap } from '@app/hooks/use-unity-map';
import { memo, useCallback, useEffect, useMemo } from 'react';

export interface ComponentMessage {
    id: string; // instance id
    type: string; // component name eg Tile
}

export interface ComponentDataMessage extends ComponentMessage {
    data: string; // json encoded (eg TileData)
}

const useUnityComponentEvent = (eventName: string, handler: () => void) => {
    const { addUnityEventListener, removeUnityEventListener } = useUnityMap();
    useEffect(() => {
        if (!addUnityEventListener) {
            return;
        }
        addUnityEventListener(eventName, handler);
        return () => {
            if (!removeUnityEventListener) {
                return;
            }
            removeUnityEventListener(eventName, handler);
        };
    }, [addUnityEventListener, removeUnityEventListener, handler, eventName]);
};

export interface ComponentEventHandlers {
    onPointerEnter?: (id: string) => void;
    onPointerExit?: (id: string) => void;
    onPointerClick?: (id: string) => void;
}

export interface ComponentConfig<T> extends ComponentEventHandlers {
    type: string;
    id?: string;
    data: T;
}

export type ComponentProp = number | string | boolean;

const useUnityComponentManager = <T,>(cfg: ComponentConfig<T>) => {
    const { type, id, data, onPointerEnter, onPointerExit, onPointerClick } = cfg;
    const ref = useMemo(() => id ?? Math.floor(Math.random() * 10000).toString(), [id]); // TODO: pick a better ref unique id
    const { sendMessage } = useUnityMap();

    useEffect(() => {
        if (!sendMessage) {
            return;
        }
        const msg: ComponentDataMessage = {
            type,
            id: ref,
            data: JSON.stringify(data),
        };
        sendMessage('ComponentManager', 'SetComponent', JSON.stringify(msg));
    }, [sendMessage, ref, type, data]);

    useEffect(() => {
        return () => {
            if (!sendMessage) {
                return;
            }
            const msg: ComponentMessage = {
                type,
                id: ref,
            };
            sendMessage('ComponentManager', 'RemoveComponent', JSON.stringify(msg));
        };
    }, [sendMessage, ref, type]);

    useUnityComponentEvent(
        `${type}_pointer_enter_${ref}`,
        useCallback(() => (onPointerEnter ? onPointerEnter(ref) : null), [ref, onPointerEnter])
    );

    useUnityComponentEvent(
        `${type}_pointer_exit_${ref}`,
        useCallback(() => (onPointerExit ? onPointerExit(ref) : null), [ref, onPointerExit])
    );

    useUnityComponentEvent(
        `${type}_pointer_click_${ref}`,
        useCallback(() => (onPointerClick ? onPointerClick(ref) : null), [ref, onPointerClick])
    );
};

export interface TileData {
    q: number;
    r: number;
    s: number;
    height: number;
    color: string;
}

export interface ComponentProps extends ComponentEventHandlers {
    id?: string;
}

export const Tile = memo(
    ({ id, q, r, s, height, color, onPointerEnter, onPointerExit, onPointerClick }: ComponentProps & TileData) => {
        useUnityComponentManager<TileData>({
            type: 'TileData',
            id,
            data: useMemo(() => ({ q, r, s, height, color }), [q, r, s, height, color]),
            onPointerEnter,
            onPointerExit,
            onPointerClick,
        });

        return null;
    }
);

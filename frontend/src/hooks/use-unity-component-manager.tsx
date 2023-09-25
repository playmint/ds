import { useUnityMap } from '@app/hooks/use-unity-map';
import { useEffect, useMemo } from 'react';

export interface ComponentMessage {
    id: string; // instance id
    type: string; // component name eg Tile
}

export interface ComponentDataMessage extends ComponentMessage {
    data: string; // json encoded (eg TileData)
}

export const useUnityComponentEvent = (eventName: string, handler?: () => void) => {
    const { addUnityEventListener, removeUnityEventListener } = useUnityMap();
    useEffect(() => {
        if (!addUnityEventListener) {
            return;
        }
        if (!handler) {
            return;
        }
        addUnityEventListener(eventName, handler);
        return () => {
            if (!removeUnityEventListener) {
                return;
            }
            if (!handler) {
                return;
            }
            removeUnityEventListener(eventName, handler);
        };
    }, [addUnityEventListener, removeUnityEventListener, handler, eventName]);
};

export interface ComponentEventHandlers {
    onPointerEnter?: (id: string, type: string) => void;
    onPointerExit?: (id: string, type: string) => void;
    onPointerClick?: (id: string, type: string) => void;
}

export interface ComponentConfig<T> extends ComponentEventHandlers {
    type: string;
    id?: string;
    data: T;
    events?: boolean;
}

export type ComponentProp = number | string | boolean;

export interface UnityComponentProps extends ComponentEventHandlers {
    id?: string;
}

export const useUnityComponentManager = <T,>(cfg: ComponentConfig<T>) => {
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
        useMemo(() => (onPointerEnter ? () => onPointerEnter(ref, type) : undefined), [onPointerEnter, ref, type])
    );

    useUnityComponentEvent(
        `${type}_pointer_exit_${ref}`,
        useMemo(() => (onPointerExit ? () => onPointerExit(ref, type) : undefined), [onPointerExit, ref, type])
    );

    useUnityComponentEvent(
        `${type}_pointer_click_${ref}`,
        useMemo(() => (onPointerClick ? () => onPointerClick(ref, type) : undefined), [onPointerClick, ref, type])
    );
};

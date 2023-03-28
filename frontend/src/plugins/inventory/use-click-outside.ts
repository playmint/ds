/** @format */
import { RefObject, useEffect, useRef } from 'react';

export const useClickOutside = (handler: (event: any) => void) => {
    const refsArray = useRef<RefObject<HTMLElement>[]>([]);
    const callback = useRef<(event: MouseEvent | TouchEvent) => void>(() => {});

    callback.current = handler;

    function isClickInside(refs: RefObject<HTMLElement>[], event: any): boolean {
        return refs.some((ref: RefObject<HTMLElement>) => {
            return !ref.current || ref.current.contains(event.target);
        });
    }

    function addRef(ref: RefObject<HTMLElement>) {
        refsArray.current.push(ref);
    }

    function removeRef(ref: RefObject<HTMLElement>) {
        const index = refsArray.current.indexOf(ref);
        if (index > -1) {
            refsArray.current.splice(index, 1);
        }
    }

    useEffect(() => {
        const listener = (event: MouseEvent | TouchEvent) => {
            // Do nothing if clicking ref's element or descendent elements
            if (isClickInside(refsArray.current, event)) {
                return;
            }
            callback.current(event);
        };

        document.addEventListener('mousedown', listener);
        document.addEventListener('touchstart', listener);

        return () => {
            document.removeEventListener('mousedown', listener);
            document.removeEventListener('touchstart', listener);
        };
    }, []);

    return {
        addRef,
        removeRef
    };
};

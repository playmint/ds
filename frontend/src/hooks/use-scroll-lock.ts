/** @format */
import { useCallback } from 'react';

export const useScrollLock = () => {
    const lockScroll = useCallback(() => {
        const scrollBarWidth = window.innerWidth - document.body.offsetWidth;
        document.body.style.overflow = 'hidden';
        document.body.style.paddingRight = `${scrollBarWidth}px`;
    }, []);

    const unlockScroll = useCallback(() => {
        document.body.style.overflow = '';
        document.body.style.paddingRight = `0`;
    }, []);

    return {
        lockScroll,
        unlockScroll
    };
};

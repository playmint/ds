/** @format */

import { useEffect } from 'react';

/**
 * A hook that will fire a callback when the window size changes
 *
 * @param callback Callback to be called when the window size changes
 * @param deps Optional array of dependencies for the effect
 */
export const useWindowResize = (callback: () => void, deps: any[] = []) => {
    useEffect(() => {
        let queued = false;

        const handleResize = () => {
            if (queued) {
                return;
            }

            queued = true;
            window.requestAnimationFrame(function () {
                callback();
                queued = false;
            });
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [...deps, callback]);
};

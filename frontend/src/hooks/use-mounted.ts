/** @format */

import { useCallback, useEffect, useRef } from 'react';

export const useMounted = (): (() => boolean) => {
    const isMounted = useRef<boolean>(false);
    const getIsMounted = useCallback(() => isMounted.current, []);

    useEffect(() => {
        isMounted.current = true;
        return function () {
            isMounted.current = false;
        };
    }, []);

    return getIsMounted;
};

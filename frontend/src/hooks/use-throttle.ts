import { useEffect, useRef, useState } from 'react';

export function useThrottle<T>(value: T, interval?: number) {
    const [throttledValue, setThrottledValue] = useState(value);
    const lastUpdated = useRef(0);

    useEffect(() => {
        const now = Date.now();

        if (now >= lastUpdated.current + (interval || 500)) {
            lastUpdated.current = now;
            setThrottledValue(value);

            return () => {};
        } else {
            const id = window.setTimeout(() => {
                lastUpdated.current = now;
                setThrottledValue(value);
            }, interval);

            return () => window.clearTimeout(id);
        }
    }, [value, interval]);

    return throttledValue;
}

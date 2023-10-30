import { useEffect, useRef } from 'react';

const useResizeObserver = ({ callback, element }: { element: any; callback: () => void }) => {
    const current = element && element.current;

    const observer = useRef<any>(null);

    useEffect(() => {
        // if we are already observing old element
        if (observer && observer.current && current) {
            observer.current.unobserve(current);
        }
        const resizer = new ResizeObserver(callback);
        observer.current = resizer;
        if (element && element.current && observer.current) {
            observer.current.observe(element.current);
        }
        if (typeof window !== 'undefined') {
            window.addEventListener('resize', callback);
        }

        return () => {
            if (resizer && current) {
                resizer.unobserve(current);
            }
            if (typeof window !== 'undefined') {
                window.removeEventListener('resize', callback);
            }
        };
    }, [current, callback, element]);
};

export default useResizeObserver;

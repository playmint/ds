import { useEffect, useRef } from 'react';

const useResizeObserver = ({ callback, element }: { element: any; callback: () => void }) => {
    const current = element && element.current;

    const observer = useRef<any>(null);

    useEffect(() => {
        // if we are already observing old element
        if (observer && observer.current && current) {
            observer.current.unobserve(current);
        }
        observer.current = new ResizeObserver(callback);
        if (element && element.current && observer.current) {
            observer.current.observe(element.current);
        }

        const el = element;
        console.log('updating');
        return () => {
            if (observer && observer.current && el && el.current) {
                observer.current.unobserve(el.current);
            }
        };
    }, [current, callback, element]);
};

export default useResizeObserver;

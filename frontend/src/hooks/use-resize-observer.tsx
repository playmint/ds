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
        observe();

        return () => {
            if (observer && observer.current && element && element.current) {
                observer.current.unobserve(element.current);
            }
        };
    }, [current]);

    const observe = () => {
        if (element && element.current && observer.current) {
            observer.current.observe(element.current);
        }
    };
};

export default useResizeObserver;

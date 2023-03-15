import { useState, useEffect } from 'react';
import { Client, State } from './client';

export function useDawnseekersState(ds: Client) {
    const [data, setData] = useState<State | null>(null);

    useEffect(() => {
        const sub = ds.subscribe({
            next(data) {
                setData(data);
                // console.log(`useDawnseekersState: next`, data);
            },
            error(err) {
                console.error(`useDawnseekersState: ${err}`);
            },
            complete() {
                console.log('useDawnseekersState: closed');
            },
        });
        return () => {
            sub.unsubscribe();
        };
    }, [ds]);

    return { data };
}

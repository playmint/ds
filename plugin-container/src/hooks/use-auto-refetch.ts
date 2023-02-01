/** @format */

import { useEffect } from 'react';
import { OnChangeDocument } from '@app/types/queries';

interface SubscribeToMoreArgs {
    document: any;
    updateQuery: (prev: any) => any;
    shouldResubscribe?: boolean;
    onError: any;
}
type SubscribeToMoreFunc = (args: SubscribeToMoreArgs) => () => void;
type RefetchFunc = () => Promise<any>;
interface AutoRefetchParams {
    subscribeToMore: SubscribeToMoreFunc;
    refetch: RefetchFunc;
    loading: boolean;
}

// to avoid the situation where 100 events all arrive in one flood causing 100
// query refetches, we "debounce" the refresh func so that the refetch request
// will not fire until the events have calmed down a bit.  Lower number =
// faster reaction, Higher number = fewer refetches
const debounceMs = 2000;

export const useAutoRefetch = ({ subscribeToMore, refetch, loading }: AutoRefetchParams) => {
    useEffect(() => {
        if (loading) {
            return;
        }
        const queueRefetch = debounce(refetch, debounceMs);
        return subscribeToMore({
            document: OnChangeDocument,
            updateQuery: (prev: any) => {
                queueRefetch();
                if (prev) {
                    return prev;
                }
            },
            onError: (err: any) => console.error(err)
        });
    }, [subscribeToMore, refetch, loading]);
};

function debounce<Params extends any[]>(func: (...args: Params) => any, timeout: number): (...args: Params) => void {
    let timer: NodeJS.Timeout;
    return (...args: Params) => {
        clearTimeout(timer);
        timer = setTimeout(() => func(...args), timeout);
    };
}

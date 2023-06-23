/** @format */

import { createContext, MutableRefObject, ReactNode, useContext, useEffect, useRef } from 'react';

export interface BlockTimeContextProviderProps {
    block: number;
    children?: ReactNode;
}

export interface BlockTimeContextStore {
    blockTime: number;
    blockNumberRef: MutableRefObject<number>;
}

export const BlockTimeContext = createContext<BlockTimeContextStore>({} as BlockTimeContextStore);

export const useBlockTime = () => useContext(BlockTimeContext);

const BLOCK_TIME_SECS = 10;

export const BlockTimeProvider = ({ block, children }: BlockTimeContextProviderProps) => {
    const lastBlockRef = useRef<number>(0);
    const lastBlockTimeRef = useRef<number>(0);
    const estimatedBlockRef = useRef<number>(0);

    useEffect(() => {
        if (block > lastBlockRef.current) {
            const nowTime = new Date().getTime() / 1000;
            lastBlockTimeRef.current = nowTime;
            lastBlockRef.current = block;
        }
    }, [block]);

    useEffect(() => {
        const id = setInterval(() => {
            const nowTime = new Date().getTime() / 1000;
            const elapsed = nowTime - lastBlockTimeRef.current;
            const newBlocks = Math.floor(elapsed / BLOCK_TIME_SECS);
            estimatedBlockRef.current = block + newBlocks;
        }, 1000);
        return () => clearInterval(id);
    }, [block]);

    const store: BlockTimeContextStore = {
        blockTime: BLOCK_TIME_SECS,
        blockNumberRef: estimatedBlockRef
    };

    return <BlockTimeContext.Provider value={store}>{children}</BlockTimeContext.Provider>;
};

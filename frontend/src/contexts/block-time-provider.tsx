/** @format */

import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

export interface BlockTimeContextProviderProps {
    block: number;
    children?: ReactNode;
}

export interface BlockTimeContextStore {
    blockTime: number;
    blockNumber: number;
}

export const BlockTimeContext = createContext<BlockTimeContextStore>({} as BlockTimeContextStore);

export const useBlockTime = () => useContext(BlockTimeContext);

const BLOCK_TIME_SECS = 5;

export const BlockTimeProvider = ({ block, children }: BlockTimeContextProviderProps) => {
    const [lastBlock, updateLastBlock] = useState<number>(0);
    const [lastBlockTime, updateLastBlockTime] = useState<number>(0);
    const [estimatedBlock, updateEstimatedBlock] = useState<number>(0);

    useEffect(() => {
        if (block > lastBlock) {
            const nowTime = new Date().getTime() / 1000;
            updateLastBlock(block);
            updateLastBlockTime(nowTime);

            console.log('TIME UPDATED: ', nowTime);
        }
    }, [block, lastBlock]);

    useEffect(() => {
        const id = setInterval(() => {
            const nowTime = new Date().getTime() / 1000;
            const elapsed = nowTime - lastBlockTime;
            const newBlocks = Math.floor(elapsed / BLOCK_TIME_SECS);
            updateEstimatedBlock(block + newBlocks);
            console.log('Estimated block', block + newBlocks);
        }, BLOCK_TIME_SECS);
        return () => clearInterval(id);
    }, [block, lastBlockTime]);

    const store: BlockTimeContextStore = {
        blockTime: BLOCK_TIME_SECS,
        blockNumber: estimatedBlock
    };

    return <BlockTimeContext.Provider value={store}>{children}</BlockTimeContext.Provider>;
};

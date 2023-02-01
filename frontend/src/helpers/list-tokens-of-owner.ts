/** @format */

import { BaseContract } from 'ethers';
import { Event as LogEvent } from '@ethersproject/contracts';

export async function listTokensOfOwner<T extends BaseContract>(contract: T, account: string): Promise<number[]> {
    const sentLogs = await contract.queryFilter(contract.filters.Transfer(account, null));
    const receivedLogs = await contract.queryFilter(contract.filters.Transfer(null, account));

    const logs: any[] = sentLogs.concat(receivedLogs).sort((a: LogEvent, b: LogEvent) => {
        return a.blockNumber - b.blockNumber || a.transactionIndex - b.transactionIndex;
    });

    const owned = logs.reduce((owned, { args: { from, to, tokenId } }) => {
        if (addressEqual(to, account)) {
            owned.add(tokenId.toNumber());
        } else if (addressEqual(from, account)) {
            owned.delete(tokenId.toNumber());
        }
        return owned;
    }, new Set<number>());

    return Array.from(owned);
}

function addressEqual(a?: string, b?: string) {
    return a?.toLowerCase() === b?.toLowerCase();
}

import detectEthereumProvider from '@metamask/detect-provider';
import { Eip1193Provider, ethers } from 'ethers';
import { concat, filter, fromPromise, fromValue, lazy, makeSubject, map, onEnd, pipe, Source, switchMap } from 'wonka';
import { CompoundKeyEncoder, NodeSelectors } from './helpers';
import { Wallet } from './types';

interface MetaMaskEthereumProvider extends Eip1193Provider {
    isMetaMask?: boolean;
    once(eventName: string | symbol, listener: (...args: any[]) => void): this;
    on(eventName: string | symbol, listener: (...args: any[]) => void): this;
    off(eventName: string | symbol, listener: (...args: any[]) => void): this;
    addListener(eventName: string | symbol, listener: (...args: any[]) => void): this;
    removeListener(eventName: string | symbol, listener: (...args: any[]) => void): this;
    removeAllListeners(event?: string | symbol): this;
}

export function makeBrowserWallet(): Source<Wallet | undefined> {
    const provider = detectEthereumProvider();
    return pipe(
        fromPromise(provider),
        filter((provider): provider is MetaMaskEthereumProvider => provider !== null && !!provider.isMetaMask),
        switchMap(newBrowserAccountSource),
        map(({ provider, address }) =>
            address
                ? ({
                      id: CompoundKeyEncoder.encodeAddress(NodeSelectors.Player, address),
                      address,
                      signer: async () => new ethers.BrowserProvider(provider).getSigner(address),
                  } satisfies Wallet)
                : undefined,
        ),
    );
}

export function makeKeyWallet(keyHexString: string): Source<Wallet> {
    const key = new ethers.SigningKey(keyHexString);
    const signer = new ethers.BaseWallet(key);
    return lazy(() =>
        fromValue({
            id: CompoundKeyEncoder.encodeAddress(NodeSelectors.Player, signer.address),
            address: signer.address,
            signer: async () => signer,
        }),
    );
}

function newBrowserAccountSource(provider: MetaMaskEthereumProvider) {
    const { source, next } = makeSubject<string | undefined>();
    const handleAccountsChanged = (accounts: string[]) => {
        const addr = getAddress(accounts);
        next(addr);
    };
    const fetchAccounts = async (): Promise<string | undefined> => {
        return provider.request({ method: 'eth_accounts' }).then(getAddress);
    };
    provider.addListener('accountsChanged', handleAccountsChanged);
    return pipe(
        lazy(() => concat([fromPromise(fetchAccounts()), source])),
        map((address) => ({ provider, address })),
        onEnd(() => {
            provider.removeListener('accountsChanged', handleAccountsChanged);
        }),
    );
}

function getAddress(accounts: string[]): string | undefined {
    if (!Array.isArray(accounts)) {
        return undefined;
    }
    if (accounts.length === 0) {
        return undefined;
    }
    if (typeof accounts[0] !== 'string') {
        return undefined;
    }
    if (!ethers.isAddress(accounts[0])) {
        return undefined;
    }
    return accounts[0];
}

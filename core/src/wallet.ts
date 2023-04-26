import { Eip1193Provider, ethers } from 'ethers';
import { concat, fromPromise, fromValue, lazy, makeSubject, map, never, pipe, Source, tap } from 'wonka';
import { CompoundKeyEncoder, NodeSelectors } from './helpers';
import { Wallet } from './types';

const ethereum: any | undefined = globalThis.ethereum;

export function makeBrowserWallet(): Source<Wallet | undefined> {
    const { accounts, fetchAccounts } = newBrowserAccountSource();
    let prev: string | undefined;
    return pipe(
        lazy(() => concat([fromPromise(fetchAccounts().catch(() => prev)), accounts])),
        tap((address) => (prev = address)),
        map((address) =>
            address
                ? ({
                      id: CompoundKeyEncoder.encodeAddress(NodeSelectors.Player, address),
                      address,
                      signer: async () => {
                          if (!ethereum) {
                              throw new Error('no injected ethereum object found');
                          }
                          const provider = new ethers.BrowserProvider(ethereum as Eip1193Provider);
                          return provider.getSigner(address);
                      },
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

function newBrowserAccountSource() {
    const { source, next } = makeSubject<string | undefined>();
    if (!ethereum) {
        console.warn('no Eip1193Provider found, this source will not work');
        return {
            accounts: never satisfies Source<string | undefined>,
            fetchAccounts: () => Promise.resolve(undefined),
        };
    }
    const getAddress = (accounts: string[]): string | undefined => {
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
    };
    const handleAccountsChanged = (accounts: string[]) => {
        console.warn('ACCOUNT CHANGED');
        const addr = getAddress(accounts);
        next(addr);
    };
    const fetchAccounts = async (): Promise<string | undefined> => {
        return ethereum.request({ method: 'eth_accounts' }).then(getAddress);
    };
    ethereum.on('accountsChanged', handleAccountsChanged);
    return { accounts: source, fetchAccounts };
}

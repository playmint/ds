import { ethers } from 'ethers';
import { concat, filter, fromPromise, fromValue, lazy, makeSubject, map, onEnd, pipe, Source, switchMap } from 'wonka';
import { CompoundKeyEncoder, NodeSelectors } from './helpers';
import { EthereumProvider, Selector, Wallet } from './types';

export type WalletProvider =
    | {
          method: 'walletconnect';
          provider: EthereumProvider;
          address?: string;
      }
    | {
          method: 'metamask';
          provider: EthereumProvider;
          address?: string;
      }
    | {
          method: 'burner';
          provider: ethers.Wallet;
          address?: string;
      };

export function makeWallet(): {
    wallet: Source<Wallet | undefined>;
    selectProvider: Selector<WalletProvider>;
} {
    const { source: provider, next: selectProvider } = makeSubject<WalletProvider>();
    const wallet = pipe(
        provider,
        filter((provider): provider is WalletProvider => provider !== null),
        switchMap(newBrowserAccountSource),
        map(({ provider, address, method }: WalletProvider) =>
            address
                ? ({
                      id: CompoundKeyEncoder.encodeAddress(NodeSelectors.Player, address),
                      address,
                      signer: async () =>
                          method === 'burner' ? provider : new ethers.BrowserProvider(provider).getSigner(address),
                      method,
                  } satisfies Wallet)
                : undefined,
        ),
    );
    return { wallet, selectProvider };
}

export function makeKeyWallet(keyHexString: string): Source<Wallet> {
    const key = new ethers.SigningKey(keyHexString);
    const signer = new ethers.BaseWallet(key);
    return lazy(() =>
        fromValue({
            id: CompoundKeyEncoder.encodeAddress(NodeSelectors.Player, signer.address),
            address: signer.address,
            signer: async () => signer,
            method: 'privatekey',
        }),
    );
}

function newBrowserAccountSource({ provider, method }: WalletProvider): Source<WalletProvider> {
    const { source, next } = makeSubject<string | undefined>();

    if (method === 'burner') {
        return lazy(() => fromValue({ provider, method, address: provider.address }));
    }

    const handleAccountsChanged = (accounts: string[]) => {
        const addr = getAddress(accounts);
        next(addr);
    };

    const fetchAccounts = async (): Promise<string | undefined> => {
        return provider.request({ method: 'eth_accounts' }).then(getAddress);
    };
    provider.on('accountsChanged', handleAccountsChanged);

    return pipe(
        lazy(() => concat([fromPromise(fetchAccounts()), source])),
        map((address) => ({ provider, address, method })),
        onEnd(() => {
            if (!provider.off) {
                return;
            }
            provider.off('accountsChanged', handleAccountsChanged);
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

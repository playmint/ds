// @refresh reset
import { Dialog } from '@app/components/molecules/dialog';
import { sleep } from '@app/helpers/sleep';
import { ActionButton } from '@app/styles/button.styles';
import { EthereumProvider, WalletProvider } from '@downstream/core';
import detectEthereumProvider from '@metamask/detect-provider';
import { EthereumProvider as WalletConnectProvider } from '@walletconnect/ethereum-provider';
import { ethers } from 'ethers';
import { QRCodeSVG } from 'qrcode.react';
import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { WalletConfig } from './use-config';
import { useLocalStorage } from './use-localstorage';

export interface WalletContextValue {
    connecting?: boolean;
    provider?: WalletProvider;
    connect?: () => void;
    disconnect?: () => void;
}

export const WalletProviderContext = createContext<WalletContextValue>({});
export const useWalletProvider = () => useContext(WalletProviderContext);

export const WalletProviderProvider = ({ children, wallets }: { children: ReactNode; wallets: WalletConfig }) => {
    const [provider, setProvider] = useState<WalletProvider>();
    const [connecting, setConnecting] = useState<boolean>(false);
    const [walletConnectURI, setWalletConnectURI] = useState<string | null>(null);
    const [autoconnectProvider, setAutoconnectProvider] = useLocalStorage(`ds/autoconnectprovider`, '');
    const [burnerPhrase, setBurnerPhrase] = useLocalStorage(`ds/burnerphrase`, '');

    const switchMetamaskNetwork = useCallback(async (provider: EthereumProvider) => {
        try {
            await provider.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x7a69' }],
            });
        } catch (switchErr: any) {
            // This error code indicates that the chain has not been added to MetaMask.
            if (switchErr.code === 4902) {
                await provider.request({
                    method: 'wallet_addEthereumChain',
                    params: [
                        {
                            chainId: '0x7a69',
                            chainName: 'localhost',
                            rpcUrls: ['http://localhost:8545'],
                        },
                    ],
                });
            } else {
                throw switchErr;
            }
        }
    }, []);

    const connectMetamask = useCallback(async () => {
        try {
            const metamask = (await detectEthereumProvider()) as EthereumProvider;
            if (!metamask) {
                console.warn('browser provider not available');
                return;
            }
            setProvider({ method: 'metamask', provider: metamask });
            await metamask.request({ method: 'eth_requestAccounts' });
            setAutoconnectProvider('metamask'); // TODO: make this opt-in
            await switchMetamaskNetwork(metamask);
        } catch (err) {
            console.error(`connect: ${err}`);
            setProvider(undefined);
        } finally {
            setConnecting(false);
        }
    }, [setAutoconnectProvider, switchMetamaskNetwork]);

    const connectWalletConnect = useCallback(async (): Promise<unknown> => {
        try {
            const wc = await WalletConnectProvider.init({
                projectId: '0061224af3af75d7af2bbfa60d3c49c3', // TODO: move to config.json
                chains: [1],
                showQrModal: false,
            });
            setWalletConnectURI('loading');
            const onDisplayURI = (uri: string) => setWalletConnectURI(uri);
            wc.on('display_uri', onDisplayURI);
            while (!document.getElementById('verify-api')) {
                await sleep(250);
            }
            await sleep(500);
            return wc
                .connect()
                .then(() => sleep(1000)) // sleepy as if we go too fast it seems walletconnect api isn't ready
                .then(() => setProvider({ method: 'walletconnect', provider: wc }))
                .catch((err) => console.error(`walletconnect: ${err}`))
                .finally(() => {
                    wc.off('display_uri', onDisplayURI);
                    setWalletConnectURI('');
                });
        } catch (err) {
            console.error(`walletconnect: ${err}`);
            return null;
        } finally {
            setConnecting(false);
            setAutoconnectProvider('walletconnect');
        }
    }, [setAutoconnectProvider]);

    const connectBurner = useCallback(async () => {
        try {
            const burner = ethers.Wallet.createRandom();
            setProvider({ method: 'burner', provider: burner });
            setBurnerPhrase(burner.mnemonic?.phrase || '');
            setAutoconnectProvider('burner');
        } catch (err) {
            console.error(`burnerconnect: ${err}`);
            setProvider(undefined);
        } finally {
            setConnecting(false);
        }
    }, [setBurnerPhrase, setAutoconnectProvider]);

    useEffect(() => {
        if (autoconnectProvider !== 'burner') {
            return;
        }
        if (!burnerPhrase) {
            return;
        }
        if (provider) {
            return;
        }
        const burner = ethers.Wallet.fromPhrase(burnerPhrase);
        setProvider({ method: 'burner', provider: burner });
        setConnecting(false);
    }, [burnerPhrase, provider, autoconnectProvider]);

    const closeWalletConnector = useCallback(() => setWalletConnectURI(''), []);
    const closeConnector = useCallback(() => setConnecting(false), []);

    const connect = useCallback(() => {
        setConnecting(true);
    }, []);

    useEffect(() => {
        if (provider) {
            return;
        }
        if (autoconnectProvider !== 'metamask') {
            return;
        }
        if (!connectMetamask) {
            return;
        }
        if (connecting) {
            console.warn('already connecting');
            return;
        }
        connectMetamask().catch((err) => console.error(err));
    }, [autoconnectProvider, connectMetamask, connecting, provider]);

    const disconnect = useCallback(() => {
        localStorage.removeItem('ds/autoconnectprovider');
        localStorage.removeItem('ds/burnerphrase');
        setProvider(undefined);
    }, []);

    const value = useMemo(() => {
        return { connect, connecting, provider, disconnect };
    }, [connect, provider, connecting, disconnect]);

    return (
        <WalletProviderContext.Provider value={value}>
            {walletConnectURI && (
                <Dialog onClose={closeWalletConnector} width="45rem" height="">
                    <QRCodeSVG
                        value={walletConnectURI}
                        size={320}
                        style={{ width: '100%', height: '100%' }}
                        includeMargin={true}
                    />
                    <p>Scan the QR code with a WalletConnect compatible phone app to connect</p>
                </Dialog>
            )}
            {connecting && (
                <Dialog onClose={closeConnector} width="304px" height="">
                    <div style={{ padding: 10 }}>
                        <h3>CONNECT USING...</h3>
                        {wallets.metamask !== false && (
                            <div>
                                <ActionButton onClick={connectMetamask}>Metamask</ActionButton>
                            </div>
                        )}
                        {wallets.walletconnect !== false && (
                            <div style={{ paddingTop: 10 }}>
                                <ActionButton onClick={connectWalletConnect}>WalletConnect</ActionButton>
                            </div>
                        )}
                        {wallets.burner !== false && (
                            <div style={{ paddingTop: 10 }}>
                                <ActionButton onClick={connectBurner}>Burner</ActionButton>
                            </div>
                        )}
                    </div>
                </Dialog>
            )}
            {children}
        </WalletProviderContext.Provider>
    );
};

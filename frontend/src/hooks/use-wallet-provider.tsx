// @refresh reset
import { Dialog } from '@app/components/molecules/dialog';
import { sleep } from '@app/helpers/sleep';
import { EthereumProvider } from '@downstream/core';
import detectEthereumProvider from '@metamask/detect-provider';
import { EthereumProvider as WalletConnectProvider } from '@walletconnect/ethereum-provider';
import { QRCodeSVG } from 'qrcode.react';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocalStorage } from './use-localstorage';
import { ActionButton } from '@app/styles/button.styles';
import { colors } from '@app/styles/colors';

export interface WalletProvider {
    method: string;
    provider: EthereumProvider;
}

export interface WalletContextValue {
    connecting?: boolean;
    provider?: WalletProvider;
    connect?: () => void;
}

export const WalletProviderContext = createContext<WalletContextValue>({});
export const useWalletProvider = () => useContext(WalletProviderContext);

export const WalletProviderProvider = ({ children }: { children: ReactNode }) => {
    const [provider, setProvider] = useState<WalletProvider>();
    const [connecting, setConnecting] = useState<boolean>(false);
    const [walletConnectURI, setWalletConnectURI] = useState<string | null>(null);
    const [autoconnectMetamask, setAutoconnectMetamask] = useLocalStorage<boolean>(`ds/autoconnect`, false);

    const connectMetamask = useCallback(async () => {
        try {
            const metamask = (await detectEthereumProvider()) as EthereumProvider;
            if (!metamask) {
                console.warn('browser provider not available');
                return;
            }
            setProvider({ method: 'metamask', provider: metamask });
            await metamask.request({ method: 'eth_requestAccounts' });
            setAutoconnectMetamask(true); // TODO: make this opt-in
        } catch (err) {
            console.error(`connect: ${err}`);
            setProvider(undefined);
        } finally {
            setConnecting(false);
        }
    }, [setAutoconnectMetamask]);

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
            setAutoconnectMetamask(false);
        }
    }, [setAutoconnectMetamask]);

    const closeWalletConnector = useCallback(() => setWalletConnectURI(''), []);
    const closeConnector = useCallback(() => setConnecting(false), []);

    const connect = useCallback(() => {
        setConnecting(true);
    }, []);

    useEffect(() => {
        if (provider) {
            return;
        }
        if (!autoconnectMetamask) {
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
    }, [autoconnectMetamask, connectMetamask, connecting, provider]);

    const value = useMemo(() => {
        return { connect, connecting, provider };
    }, [connect, provider, connecting]);

    return (
        <WalletProviderContext.Provider value={value}>
            {walletConnectURI && (
                <Dialog onClose={closeWalletConnector} width="350px" height="">
                    <div style={{ padding: 5 }}>
                        <QRCodeSVG
                            value={walletConnectURI}
                            size={256}
                            bgColor={colors.grey_4}
                            fgColor={'#ffffff'}
                            imageSettings={{
                                src: '/qrunit.png',
                                width: 48,
                                height: 41,
                                excavate: true,
                            }}
                        />
                        Scan the QR code with a WalletConnect compatible phone app to connect
                    </div>
                </Dialog>
            )}
            {connecting && (
                <Dialog onClose={closeConnector} width="304px" height="">
                    <div style={{ padding: 10 }}>
                        <h3>CONNECT USING...</h3>
                        <div>
                            <ActionButton onClick={connectMetamask}>Metamask</ActionButton>
                        </div>
                        <div style={{ paddingTop: 10 }}>
                            <ActionButton onClick={connectWalletConnect}>WalletConnect</ActionButton>
                        </div>
                    </div>
                </Dialog>
            )}
            {children}
        </WalletProviderContext.Provider>
    );
};

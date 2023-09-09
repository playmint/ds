import { Dialog } from '@app/components/molecules/dialog';
import { sleep } from '@app/helpers/sleep';
import { EthereumProvider } from '@downstream/core';
import detectEthereumProvider from '@metamask/detect-provider';
import { EthereumProvider as WalletConnectProvider } from '@walletconnect/ethereum-provider';
import { QRCodeSVG } from 'qrcode.react';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocalStorage } from './use-localstorage';

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
            setAutoconnectMetamask(true); // TODO: make this optional
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
                projectId: '0061224af3af75d7af2bbfa60d3c49c3',
                chains: [1], // REQUIRED chain ids
                showQrModal: false, // REQUIRED set to "true" to use @web3modal/standalone,
                // methods, // OPTIONAL ethereum methods
                // events, // OPTIONAL ethereum events
                // rpcMap, // OPTIONAL rpc urls for each chain
                // metadata, // OPTIONAL metadata of your app
                // qrModalOptions, // OPTIONAL - `undefined` by default, see https://docs.walletconnect.com/2.0/web3modal/options
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
                .then(() => sleep(1000))
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
                <Dialog onClose={closeWalletConnector} width="304px" height="">
                    <div style={{ padding: 5 }}>
                        <QRCodeSVG
                            value={walletConnectURI}
                            size={256}
                            bgColor={'#143063'}
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
                            <button className="action-button" onClick={connectMetamask}>
                                Metamask
                            </button>
                        </div>
                        <div style={{ paddingTop: 10 }}>
                            <button className="action-button" onClick={connectWalletConnect}>
                                WalletConnect
                            </button>
                        </div>
                    </div>
                </Dialog>
            )}
            {children}
        </WalletProviderContext.Provider>
    );
};

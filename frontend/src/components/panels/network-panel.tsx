import { useConfig } from '@app/hooks/use-config';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { EthereumProvider, WalletProvider } from '@downstream/core';
import detectEthereumProvider from '@metamask/detect-provider';
import styled from 'styled-components';
import { StyledHeaderPanel } from '@app/styles/base-panel.styles';
import { TextButton } from '@app/styles/button.styles';

const Banner = styled(StyledHeaderPanel)`
    position: relative;
    top: 0;
    width: 100%;
    background-color: #f9f9f9;
    z-index: 9999;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px 0;
    border-top: 0px;
    border-left: 0px;
    border-right: 0px;
    border-top-left-radius: 0;
    border-top-right-radius: 0;
`;

const Text = styled.p`
    margin: 0;
    padding-right: 20px;
`;

export interface WalletContextValue {
    provider?: WalletProvider;
}

export const WalletProviderContext = createContext<WalletContextValue>({});
export const useWalletProvider = () => useContext(WalletProviderContext);

export const NetworkPanel = () => {
    const config = useConfig();
    const [connecting, setConnecting] = useState<boolean>(false);
    const [shouldRender, setShouldRender] = useState<boolean>(true);

    const checkNetwork = useCallback(async () => {
        const metamask = (await detectEthereumProvider()) as EthereumProvider;
        if (!metamask || !config) {
            console.warn('Browser provider not available or no config found');
            setShouldRender(false);
            return;
        }

        const gotChainId = (metamask as any).networkVersion || 'unknown';
        if (gotChainId === config.networkID) {
            console.log('Already on the correct network');
            setShouldRender(false);
            return;
        }
        setShouldRender(true);

        // Listen for network changes
        window.ethereum.on('chainChanged', async () => {
            console.log('chainChanged event triggered');
            try {
                await checkNetwork();
            } catch (error) {
                console.error(error);
            }
        });
    }, [config, connecting]);

    useEffect(() => {
        void (async () => {
            try {
                await checkNetwork();
            } catch (error) {
                console.error('Error checking network:', error);
            }
        })();
    }, [checkNetwork]);

    const switchMetamaskNetwork = useCallback(
        async (provider: EthereumProvider) => {
            if (!config) {
                console.warn('no config found');
                return;
            }
            const gotChainId = (provider as any).networkVersion || 'unknown';
            if (gotChainId === config.networkID) {
                console.log('already on the correct network');
                return;
            }
            const chainId = `0x${BigInt(config.networkID).toString(16)}`;
            try {
                await provider.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId }],
                });
            } catch (switchErr: any) {
                // This error code indicates that the chain has not been added to MetaMask.
                if (switchErr.code === 4902) {
                    await provider.request({
                        method: 'wallet_addEthereumChain',
                        params: [
                            {
                                chainId,
                                chainName: config.networkName,
                                rpcUrls: [config.networkEndpoint],
                                nativeCurrency: {
                                    name: 'ETH',
                                    symbol: 'ETH',
                                    decimals: 18,
                                },
                            },
                        ],
                    });
                } else {
                    throw switchErr;
                }
            }
        },
        [config]
    );

    const switchNetwork = useCallback(async () => {
        if (connecting) {
            console.warn('already switching network');
            return;
        }
        try {
            console.log('clicked');
            const metamask = (await detectEthereumProvider()) as EthereumProvider;
            if (!metamask) {
                console.warn('browser provider not available');
                return;
            }
            try {
                await switchMetamaskNetwork(metamask);
            } catch (err) {
                console.error(`failed to switch network:`, err);
            }
        } catch (err) {
            console.error(`connect: ${err}`);
        } finally {
            setConnecting(false);
        }
    }, [connecting, switchMetamaskNetwork]);

    if (!shouldRender) {
        return null;
    }

    return (
        <Banner>
            <Text>
                You need to switch to the <b>{config?.networkName}</b> network in MetaMask
            </Text>
            <TextButton onClick={switchNetwork}>Switch Network</TextButton>
        </Banner>
    );
};

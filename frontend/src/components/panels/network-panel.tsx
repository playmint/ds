import { useConfig } from '@app/hooks/use-config';
import { useCallback, useEffect, useState } from 'react';
import { EthereumProvider, WalletProvider } from '@downstream/core';
import detectEthereumProvider from '@metamask/detect-provider';
import styled from 'styled-components';
import { StyledHeaderPanel } from '@app/styles/base-panel.styles';
import { TextButton } from '@app/styles/button.styles';
import { useWalletProvider } from '@app/hooks/use-wallet-provider';

const Banner = styled(StyledHeaderPanel)`
    position: fixed;
    bottom: 0;
    width: 100%;
    background-color: rgba(249, 249, 249, 0.8);
    backdrop-filter: blur(10px);
    z-index: 9999;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px 0;
    border-top: 3px solid black;
    border-left: 0px;
    border-right: 0px;
    border-bottom: 0px;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
`;

const Text = styled.p`
    margin: 0;
    padding-right: 20px;
`;

const CloseButton = styled.button`
    position: absolute;
    right: 20px;
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
`;

export interface WalletContextValue {
    provider?: WalletProvider;
}

export const NetworkPanel = () => {
    const config = useConfig();
    const [connecting, setConnecting] = useState<boolean>(false);
    const [shouldRender, setShouldRender] = useState<boolean>(true);
    const { provider } = useWalletProvider();

    const closeBanner = () => {
        setShouldRender(false);
    };

    const checkNetwork = useCallback(async () => {
        if (provider?.method.toLowerCase() !== 'metamask') {
            setShouldRender(false);
            return;
        }

        const metamask = (await detectEthereumProvider()) as EthereumProvider;
        if (!metamask || !config) {
            console.warn('Browser provider not available or no config found');
            setShouldRender(false);
            return;
        }

        const gotChainId = (metamask as any).networkVersion || 'unknown';
        if (gotChainId === config.networkID) {
            setShouldRender(false);
            return;
        }
        setShouldRender(true);
    }, [config, provider?.method]);

    useEffect(() => {
        void (async () => {
            try {
                await checkNetwork();
            } catch (error) {
                console.error('Error checking network:', error);
            }
        })();
    }, [checkNetwork]);

    useEffect(() => {
        const { ethereum } = window as any;
        if (!ethereum || !ethereum.on) return;

        const handleNetworkChange = async () => {
            console.log('MetaMask network changed.');
            await checkNetwork();
        };

        console.log('Adding MetaMask event listeners');

        ethereum.on('chainChanged', handleNetworkChange);
        ethereum.on('accountsChanged', handleNetworkChange);
        ethereum.on('networkChanged', handleNetworkChange);
        ethereum.on('connect', handleNetworkChange);
        ethereum.on('disconnect', handleNetworkChange);

        return () => {
            ethereum.removeListener('chainChanged', handleNetworkChange);
            ethereum.removeListener('accountsChanged', handleNetworkChange);
            ethereum.removeListener('networkChanged', handleNetworkChange);
            ethereum.removeListener('connect', handleNetworkChange);
            ethereum.removeListener('disconnect', handleNetworkChange);
        };
    }, [checkNetwork]); // Dependency on checkNetwork ensures it's using the latest instance

    const switchMetamaskNetwork = useCallback(
        async (provider: EthereumProvider) => {
            if (!config) {
                console.warn('No config found');
                return;
            }
            const gotChainId = (provider as any).networkVersion || 'unknown';
            if (gotChainId === config.networkID) {
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
            console.warn('Already switching network');
            return;
        }
        setConnecting(true);
        try {
            const metamask = (await detectEthereumProvider()) as EthereumProvider;
            if (!metamask) {
                console.warn('Browser provider not available');
                setConnecting(false);
                return;
            }
            await switchMetamaskNetwork(metamask);
        } catch (err) {
            console.error(`Failed to switch network:`, err);
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
            <CloseButton onClick={closeBanner}>x</CloseButton>
        </Banner>
    );
};

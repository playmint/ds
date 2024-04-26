import { useConfig } from '@app/hooks/use-config';
import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { EthereumProvider, WalletProvider } from '@downstream/core';
import { ethers } from 'ethers';
import styled from 'styled-components';
import { StyledBasePanel, StyledHeaderPanel } from '@app/styles/base-panel.styles';
import { TextButton } from '@app/styles/button.styles';

const Banner = styled(StyledHeaderPanel)`
    position: fixed;
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

export const NetworkPanel = () => {
    const config = useConfig();
    if (!config) return;
    console.log('config file:', config.networkName);

    return (
        <Banner>
            <Text>You need to switch to the XYZ network</Text>
            <TextButton
                onClick={() => {
                    /* metamask switch network to correct one */
                }}
            >
                Switch Network
            </TextButton>
        </Banner>
    );
};

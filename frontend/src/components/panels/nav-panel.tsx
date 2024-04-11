import { decodeString } from '@app/helpers';
import { usePlayer, useWallet } from '@app/hooks/use-game-state';
import { useSession } from '@app/hooks/use-session';
import { GlobalUnityContext } from '@app/hooks/use-unity-instance';
import { useWalletProvider } from '@app/hooks/use-wallet-provider';
import { ActionButton, TextButton } from '@app/styles/button.styles';
import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { Dialog } from '../molecules/dialog';
import { ZoneWithBags } from '@downstream/core';

const g = globalThis as unknown as { __globalUnityContext: GlobalUnityContext };

const AccountButton = styled.button`
    display: flex;
    justify-content: flex-end;
    align-items: center;
    border: 0;
    background: #050f25;
    color: #fff;
    padding: 0 1.6rem;
    margin: 0;
    border-radius: 1rem;

    > svg {
        margin-left: 0.2rem;
    }

    > .text {
        display: block;
        padding-top: 5px;
        margin: 0 1rem;
    }
`;

const NavContainer = styled.div`
    position: relative;
    z-index: 10;
    display: flex;
    justify-content: flex-start;
    height: 5rem;
    user-select: none;
    margin-bottom: 1.5rem;
    pointer-events: none;
    gap: 1rem;
    > * {
        pointer-events: all;
    }
`;

export const NavPanel = ({
    toggleQuestsActive,
    questsActive,
    questsCount,
    toggleWalletItemsActive,
    walletItemsActive,
    zone,
}: {
    questsCount?: number;
    questsActive?: boolean;
    toggleQuestsActive?: () => void;
    toggleWalletItemsActive?: () => void;
    walletItemsActive?: boolean;
    zone?: ZoneWithBags;
}) => {
    const { connect, disconnect: forgetProvider, provider } = useWalletProvider();
    const { clearSession } = useSession();
    const { wallet } = useWallet();
    const player = usePlayer();
    const [showAccountDialog, setShowAccountDialog] = useState(false);
    const [islandName, setIslandName] = useState(decodeString(zone?.name?.value ?? '') || '');
    const [islandDescription, setIslandDescription] = useState(decodeString(zone?.description?.value ?? '') || '');

    const hasConnection = player || wallet;
    const address = player?.addr || wallet?.address || '';

    const isZoneOwner = address === zone?.owner?.addr;

    const closeAccountDialog = useCallback(() => {
        setShowAccountDialog(false);
    }, []);

    const openAccountDialog = useCallback(() => {
        setShowAccountDialog(true);
    }, []);

    const disconnect = useCallback(() => {
        if (clearSession) {
            clearSession();
        }
        if (forgetProvider) {
            forgetProvider();
        }
        window.location.reload();
    }, [clearSession, forgetProvider]);

    const canvasHeight = g.__globalUnityContext?.getCanvasHeight ? g.__globalUnityContext.getCanvasHeight() : -1;
    const onChangeQuality = useCallback((e) => {
        if (!e) {
            return;
        }
        const newHeight = parseInt(e.target.value, 10);
        if (g.__globalUnityContext?.setCanvasHeight) {
            g.__globalUnityContext.setCanvasHeight(newHeight);
        }
    }, []);

    const handleIslandNameChange = useCallback((e) => {
        setIslandName(e.target.value.slice(0, 31));
    }, []);

    const handleIslandDescriptionChange = useCallback((e) => {
        setIslandDescription(e.target.value.slice(0, 31));
    }, []);

    const applyIslandChanges = useCallback(() => {
        if (!player) {
            return;
        }
        if (
            islandName === decodeString(zone?.name?.value ?? '') &&
            islandDescription === decodeString(zone?.description?.value ?? '')
        ) {
            console.log("Can't apply changes, no changes detected.");
            return;
        }
        player
            .dispatch(
                { name: 'NAME_OWNED_ENTITY', args: [zone?.id, islandName] },
                { name: 'DESCRIBE_OWNED_ENTITY', args: [zone?.id, islandDescription] }
            )
            .catch((err) => console.error('naming failed', err));
    }, [player, islandName, zone?.name?.value, zone?.description?.value, zone?.id, islandDescription]);

    // TEMP: allow revealing the burner private key, this is a workaround for
    // helping demo ds-cli bits for people without walletconnect
    const [burnerKey, setBurnerKey] = useState<string | null>(null);
    const [showBurnerKey, setShowBurnerKey] = useState<boolean>(false);
    useEffect(() => {
        if (!provider) {
            setBurnerKey(null);
            return;
        }
        if (provider.method !== 'burner') {
            setBurnerKey(null);
            return;
        }
        setBurnerKey(provider.provider.privateKey);
    }, [provider]);

    useEffect(() => {
        setIslandName(decodeString(zone?.name?.value ?? '') || '');
        setIslandDescription(decodeString(zone?.description?.value ?? '') || '');
    }, [zone?.name?.value, zone?.description?.value]);

    return (
        <NavContainer>
            {showAccountDialog && hasConnection && (
                <Dialog onClose={closeAccountDialog} width="304px" height="">
                    <div style={{ padding: 0 }}>
                        <h3>SETTINGS</h3>
                        <p>
                            0x{address.slice(0, 9)}...{address.slice(-9)}
                        </p>
                        <br />

                        {isZoneOwner && (
                            <fieldset>
                                <legend>Owner Controls</legend>
                                <div>
                                    <strong>Island Name:</strong>
                                    <input type="text" value={islandName} onChange={handleIslandNameChange} />
                                </div>
                                <br />
                                <div>
                                    <strong>Island Description:</strong>
                                    <input
                                        type="text"
                                        value={islandDescription}
                                        onChange={handleIslandDescriptionChange}
                                    />
                                </div>
                                <br />
                                <button onClick={applyIslandChanges} style={{ width: '100%' }}>
                                    Apply
                                </button>
                            </fieldset>
                        )}

                        <br />

                        <fieldset>
                            <legend>Quality</legend>
                            <select onChange={onChangeQuality} value={canvasHeight}>
                                <option value="480">Low (480p)</option>
                                <option value="720">Medium (720p)</option>
                                <option value="1080">High (1080p)</option>
                                <option value="-1">
                                    Auto ({Math.min(window.innerHeight, window.innerHeight * window.devicePixelRatio)}p)
                                </option>
                                <option value="-2">
                                    Native ({Math.floor(window.innerHeight * window.devicePixelRatio)}p)
                                </option>
                            </select>
                        </fieldset>
                        <br />
                        {burnerKey ? (
                            <>
                                <fieldset>
                                    <legend>Private Key</legend>
                                    {showBurnerKey ? (
                                        <input type="text" disabled={true} value={burnerKey} />
                                    ) : (
                                        <button style={{ width: '100%' }} onClick={() => setShowBurnerKey(true)}>
                                            show
                                        </button>
                                    )}
                                </fieldset>
                                <br />
                            </>
                        ) : undefined}

                        <ActionButton onClick={disconnect}>Disconnect</ActionButton>
                    </div>
                </Dialog>
            )}
            <AccountButton onClick={player ? openAccountDialog : connect}>
                <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 35 30" fill="none">
                    <path
                        d="M18.143 26.641c0.516-0.902 1.248-1.502 2.307-1.701 0.208 0 0.417 0 0.625 0 0.367 0.117 0.737 0.228 1.056 0.455 0.318 0.406 0.837 0.919 1.321 1.104 0.911 0.349 1.611-0.346 2.193-0.947 0.422-0.436 0.748-1.134 0.519-1.739-0.205-0.542-0.802-0.825-1.123-1.289-0.682-0.986-0.503-2.274 0.136-3.217 0.303-0.447 0.707-0.823 1.248-0.94 0.505-0.109 1.016 0.036 1.522-0.023 0.469-0.055 1.068-0.434 1.213-0.919 0.278-0.93 0.406-2.531-0.647-3.036-1.119-0.537-2.336 0.087-3.235-1.023-0.417-0.515-0.715-1.195-0.741-1.861-0.035-0.871 0.492-1.362 1.066-1.944 0.405-0.411 0.696-1.077 0.542-1.668-0.136-0.518-0.515-0.937-0.916-1.273-0.736-0.618-1.717-0.792-2.474-0.119-0.218 0.194-0.415 0.409-0.622 0.614-0.172 0.17-0.363 0.311-0.593 0.393-1.143 0.409-2.089 0.002-2.96-0.715-0.082-0.099-0.152-0.206-0.226-0.311-0.224-0.394-0.33-0.815-0.317-1.271 0.008-0.308 0.025-0.618-0.022-0.925-0.224-1.471-2.472-1.766-3.521-1.054-0.651 0.442-0.666 1.285-0.732 1.991-0.072 0.77-0.249 1.46-0.914 1.927-0.567 0.398-1.358 0.636-2.051 0.532-0.383-0.057-0.722-0.232-1.032-0.457-0.646-0.468-1.022-1.19-1.941-1.111-0.815 0.070-1.564 0.761-1.934 1.46-0.527 0.997-0.032 1.591 0.638 2.319 0.69 0.75 0.902 1.53 0.595 2.515-0.305 0.979-0.864 1.697-1.925 1.828-0.591 0.073-1.26-0.033-1.81 0.24-0.732 0.363-0.738 1.253-0.74 1.962-0.002 0.811 0.133 1.615 1.023 1.838 0.93 0.233 2.005 0.064 2.776 0.773 0.935 0.859 1.193 2.199 0.52 3.27-0.238 0.379-0.558 0.696-0.813 1.062-0.311 0.446-0.342 0.785-0.391 1.311 0.212 0.246 0.262 0.585 0.456 0.837 0.499 0.649 1.205 1.116 2.049 1.092 0.818-0.023 1.242-0.953 1.874-1.376 0.41-0.186 0.837-0.286 1.29-0.241 0.448 0.045 0.845 0.258 1.268 0.387 0.187 0.126 0.374 0.253 0.56 0.379 0.103 0.131 0.206 0.262 0.309 0.393 0.093 0.119 0.147 0.23 0.203 0.37 0.042 0.107 0.086 0.213 0.109 0.326 0.040 0.203 0.065 0.419 0.069 0.625 0.003 0.168-0.003 0.336-0.001 0.504 0.011 1.107 0.653 1.651 1.725 1.709 1.020 0.055 2.164-0.087 2.363-1.307 0.065-0.398-0.031-0.841-0.012-1.248zM7.016 9.576c-0.001-0.003-0.002-0.005-0.002-0.008 0.003 0.001 0.007 0.002 0.010 0.003-0.003 0.001-0.005 0.003-0.008 0.005zM15.955 22.151c-3.21 0-5.813-2.602-5.813-5.813s2.602-5.813 5.813-5.813c3.21 0 5.813 2.602 5.813 5.813s-2.602 5.813-5.813 5.813zM23.45 25.817c-0-0-0.001-0-0.001-0s0.001 0 0.001 0c-0 0-0 0-0 0zM23.889 26.069c-0.001-0.001-0.002-0.002-0.003-0.003 0.002-0.001 0.005-0.001 0.007-0.002-0.001 0.002-0.003 0.003-0.004 0.005z"
                        fill="#F7F5FA"
                    />
                </svg>
                {!player && <span className="text">CONNECT</span>}
            </AccountButton>

            {toggleWalletItemsActive && (
                <TextButton onClick={toggleWalletItemsActive} className={`${walletItemsActive ? 'toggleOn' : ''}`}>
                    WALLET
                </TextButton>
            )}

            {typeof questsActive !== 'undefined' && questsCount && questsCount > 0 ? (
                <TextButton onClick={toggleQuestsActive} className={`${questsActive ? 'toggleOn' : ''}`}>
                    QUESTS
                    {questsCount && questsCount > 0 ? (
                        <span style={{ opacity: 0.4, color: '#333' }}> ({questsCount})</span>
                    ) : undefined}
                </TextButton>
            ) : undefined}
        </NavContainer>
    );
};

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
    className,
}: {
    questsCount?: number;
    questsActive?: boolean;
    toggleQuestsActive?: () => void;
    toggleWalletItemsActive?: () => void;
    walletItemsActive?: boolean;
    zone?: ZoneWithBags;
    className?: string;
}) => {
    const { connect, disconnect: forgetProvider, provider } = useWalletProvider();
    const { clearSession } = useSession();
    const { wallet } = useWallet();
    const player = usePlayer();
    const [showAccountDialog, setShowAccountDialog] = useState(false);
    const [islandName, setIslandName] = useState(decodeString(zone?.name?.value ?? '') || '');
    const [islandDescription, setIslandDescription] = useState(zone?.description?.value || '');

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
        setIslandDescription(e.target.value.slice(0, 140));
    }, []);

    const applyIslandChanges = useCallback(() => {
        if (!player) {
            return;
        }
        if (islandName === decodeString(zone?.name?.value ?? '') && islandDescription === zone?.description?.value) {
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
        setIslandDescription(zone?.description?.value || '');
    }, [zone?.name?.value, zone?.description?.value]);

    return (
        <NavContainer className={className}>
            {showAccountDialog && hasConnection && (
                <Dialog onClose={closeAccountDialog} width="304px" height="">
                    <div style={{ padding: 0 }}>
                        <h3>SETTINGS</h3>
                        <p>
                            {address.slice(0, 9)}...{address.slice(-9)}
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
                {hasConnection ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="25" height="30" viewBox="3 0 20 24" fill="none">
                        <path
                            d="m2.344 15.271 2 3.46a1 1 0 0 0 1.366.365l1.396-.806c.58.457 1.221.832 1.895 1.112V21a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-1.598a8.094 8.094 0 0 0 1.895-1.112l1.396.806c.477.275 1.091.11 1.366-.365l2-3.46a1.004 1.004 0 0 0-.365-1.366l-1.372-.793a7.683 7.683 0 0 0-.002-2.224l1.372-.793c.476-.275.641-.89.365-1.366l-2-3.46a1 1 0 0 0-1.366-.365l-1.396.806A8.034 8.034 0 0 0 15 4.598V3a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v1.598A8.094 8.094 0 0 0 7.105 5.71L5.71 4.904a.999.999 0 0 0-1.366.365l-2 3.46a1.004 1.004 0 0 0 .365 1.366l1.372.793a7.683 7.683 0 0 0 0 2.224l-1.372.793c-.476.275-.641.89-.365 1.366zM12 8c2.206 0 4 1.794 4 4s-1.794 4-4 4-4-1.794-4-4 1.794-4 4-4z"
                            fill="#dedede"
                        />
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 500 500" fill="none">
                        <path
                            d="M461.2 128H80c-8.84 0-16-7.16-16-16s7.16-16 16-16h384c8.84 0 16-7.16 16-16 0-26.51-21.49-48-48-48H64C28.65 32 0 60.65 0 96v320c0 35.35 28.65 64 64 64h397.2c28.02 0 50.8-21.53 50.8-48V176c0-26.47-22.78-48-50.8-48zM416 336c-17.67 0-32-14.33-32-32s14.33-32 32-32 32 14.33 32 32-14.33 32-32 32z"
                            fill="#dedede"
                        />
                    </svg>
                )}
                {!player && <span className="text">CONNECT</span>}
            </AccountButton>

            {address && toggleWalletItemsActive && (
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

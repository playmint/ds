import { usePlayer, useWallet } from '@app/hooks/use-game-state';
import { useSession } from '@app/hooks/use-session';
import { GlobalUnityContext } from '@app/hooks/use-unity-instance';
import { useWalletProvider } from '@app/hooks/use-wallet-provider';
import { ActionButton, TextButton } from '@app/styles/button.styles';
import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { Dialog } from '../molecules/dialog';

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
    className,
}: {
    questsCount?: number;
    questsActive?: boolean;
    toggleQuestsActive?: () => void;
    toggleWalletItemsActive?: () => void;
    walletItemsActive?: boolean;
    className?: string;
}) => {
    const { connect, disconnect: forgetProvider, provider } = useWalletProvider();
    const { clearSession } = useSession();
    const { wallet } = useWallet();
    const player = usePlayer();
    const [showAccountDialog, setShowAccountDialog] = useState(false);

    const hasConnection = player || wallet;
    const address = player?.addr || wallet?.address || '';

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

    return (
        <NavContainer className={className}>
            {showAccountDialog && hasConnection && (
                <Dialog onClose={closeAccountDialog} width="304px" height="">
                    <div style={{ padding: 15 }}>
                        <h3>PLAYER ACCOUNT</h3>
                        <p>
                            {address.slice(0, 9)}...{address.slice(-9)}
                        </p>
                        <br />

                        <fieldset>
                            <legend>Quality:</legend>
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
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="20" viewBox="0 0 16 20" fill="none">
                    <path
                        d="M7.93965 11.9394C11.5641 11.917 16 14.0805 16 18.2253C16 19.2054 15.2116 20 14.239 20H1.76101C0.78843 20 0 19.2054 0 18.2253C0 14.1255 4.34649 11.9616 7.93965 11.9394Z"
                        fill="#F7F5FA"
                    />
                    <path
                        d="M2.97741 5C2.97741 3.13077 2.97741 2.19615 3.37623 1.5C3.63751 1.04394 4.0133 0.665229 4.46584 0.401924C5.15663 0 6.08403 0 7.93885 0C9.79366 0 10.7211 0 11.4119 0.401924C11.8644 0.665229 12.2402 1.04394 12.5015 1.5C12.9003 2.19615 12.9003 3.13077 12.9003 5C12.9003 6.86923 12.9003 7.80385 12.5015 8.5C12.2402 8.95606 11.8644 9.33477 11.4119 9.59807C10.7211 10 9.79366 10 7.93885 10C6.08403 10 5.15663 10 4.46584 9.59807C4.0133 9.33477 3.63751 8.95606 3.37623 8.5C2.97741 7.80385 2.97741 6.86923 2.97741 5Z"
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

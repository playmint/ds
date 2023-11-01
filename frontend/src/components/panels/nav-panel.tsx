import { formatNameOrId } from '@app/helpers';
import { usePlayer, useWallet } from '@app/hooks/use-game-state';
import { useSession } from '@app/hooks/use-session';
import { useWalletProvider } from '@app/hooks/use-wallet-provider';
import { useCallback, useState } from 'react';
import styled from 'styled-components';
import { Dialog } from '../molecules/dialog';
import { GlobalUnityContext } from '@app/hooks/use-unity-instance';
import { ActionButton } from '@app/styles/button.styles';

const g = globalThis as unknown as { __globalUnityContext: GlobalUnityContext };

const AccountButton = styled.button`
    display: flex;
    justify-content: flex-end;
    align-items: center;
    border: 0;
    background: #050f25;
    color: #fff;
    padding: 0 1rem;
    margin: 0;
    border-radius: 1rem;

    > img {
        margin-right: 0.3rem;
    }

    > .text {
        display: block;
        padding-top: 5px;
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
    pointer-events: all;
`;

export const NavPanel = () => {
    const { connect, disconnect: forgetProvider } = useWalletProvider();
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

    return (
        <NavContainer>
            {showAccountDialog && hasConnection && (
                <Dialog onClose={closeAccountDialog} width="304px" height="">
                    <div style={{ padding: 15 }}>
                        <h3>PLAYER ACCOUNT</h3>
                        <p>
                            0x{address.slice(0, 9)}...{address.slice(-9)}
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

                        <ActionButton onClick={disconnect}>Disconnect</ActionButton>
                    </div>
                </Dialog>
            )}
            <AccountButton onClick={player ? openAccountDialog : connect}>
                <img src="/icons/player.png" alt="" />
                <span className="text">{player ? formatNameOrId(player, 'Player 0x..') : 'connect'}</span>
            </AccountButton>
        </NavContainer>
    );
};

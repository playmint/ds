import { formatNameOrId } from '@app/helpers';
import { usePlayer, useWallet } from '@app/hooks/use-game-state';
import { useSession } from '@app/hooks/use-session';
import { useWalletProvider } from '@app/hooks/use-wallet-provider';
import { useCallback, useState } from 'react';
import styled from 'styled-components';
import { Dialog } from '../molecules/dialog';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { GlobalUnityContext } from '@app/hooks/use-unity-instance';
import { ActionButton } from '@app/styles/button.styles';

const g = globalThis as unknown as { __globalUnityContext: GlobalUnityContext };

const AccountButton = styled.button`
    display: flex;
    justify-content: flex-end;
    align-items: center;
    border: 0;
    border-left: 1px solid #314a7b;
    background: #050f25;
    color: #fff;
    padding: 0 2rem 0 1rem;

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
    background: #030f25;
    user-select: none;
    zoom: 90%;
`;

const NavLink = styled.div`
    padding: 1.4rem;
    &.active {
        background: #335c90;
    }
    a {
        color: white;
        text-decoration: none;
    }
`;

export const NavPanel = () => {
    const { connect, disconnect: forgetProvider } = useWalletProvider();
    const { clearSession } = useSession();
    const { wallet } = useWallet();
    const player = usePlayer();
    const [showAccountDialog, setShowAccountDialog] = useState(false);
    const router = useRouter();

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
            {showAccountDialog && wallet && (
                <Dialog onClose={closeAccountDialog} width="304px" height="">
                    <div style={{ padding: 15 }}>
                        <h3>PLAYER ACCOUNT</h3>
                        <p>
                            0x{wallet.address.slice(0, 9)}...{wallet.address.slice(-9)}
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
            <AccountButton onClick={wallet ? openAccountDialog : connect}>
                <img src="/icons/player.png" alt="" />
                <span className="text">
                    {!wallet ? 'connect' : !player ? 'connecting' : formatNameOrId(player, 'Player 0x..')}
                </span>
            </AccountButton>
            <div style={{ flexGrow: 1 }}></div>
            <NavLink className={router.pathname == '/' ? 'active' : ''}>
                <Link href={`/`}>Map</Link>
            </NavLink>
            <NavLink className={router.pathname.startsWith('/docs') ? 'active' : ''}>
                <Link href={`/docs/code-docs/extending-downstream`}>Docs</Link>
            </NavLink>
        </NavContainer>
    );
};

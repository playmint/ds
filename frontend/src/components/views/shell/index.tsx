/** @format */

import { Dialog } from '@app/components/molecules/dialog';
import { trackEvent, trackPlayer } from '@app/components/organisms/analytics';
import { Logs } from '@app/components/organisms/logs';
import { UnityMap } from '@app/components/organisms/unity-map';
import { formatNameOrId } from '@app/helpers';
import { ActionBar } from '@app/plugins/action-bar';
import { ActionContextPanel } from '@app/plugins/action-context-panel';
import { CombatModal } from '@app/plugins/combat/combat-modal';
import { CombatRewards } from '@app/plugins/combat/combat-rewards';
import { CombatSummary } from '@app/plugins/combat/combat-summary';
import { MobileUnitInventory } from '@app/plugins/inventory/mobile-unit-inventory';
import { TileCoords } from '@app/plugins/tile-coords';
import { ComponentProps } from '@app/types/component-props';
import {
    CompoundKeyEncoder,
    ConnectedPlayer,
    EthereumProvider,
    NodeSelectors,
    Selection,
    SelectionSelectors,
    Selector,
    Wallet,
    WalletProvider,
    WorldStateFragment,
} from '@downstream/core';
import detectEthereumProvider from '@metamask/detect-provider';
import { EthereumProvider as WalletConnectProvider } from '@walletconnect/ethereum-provider';
import { QRCodeSVG } from 'qrcode.react';
import { Fragment, FunctionComponent, useCallback, useEffect, useState } from 'react';
import { UnityProvider } from 'react-unity-webgl/distribution/types/unity-provider';
import styled from 'styled-components';
import { styles } from './shell.styles';

enum CombatModalState {
    INACTIVE,
    NEW_SESSION,
    EXISTING_SESSION,
}

export interface ShellProps extends ComponentProps, Partial<SelectionSelectors> {
    wallet?: Wallet;
    selectProvider: Selector<WalletProvider>;
    world?: WorldStateFragment;
    player?: ConnectedPlayer;
    blockNumber?: number;
    selection?: Selection;
    unityProvider: UnityProvider;
    sendMessage: (gameObjectName: string, methodName: string, parameter?: any) => void;
    mapReady: boolean;
}

const StyledShell = styled('div')`
    ${styles}
`;

export const Shell: FunctionComponent<ShellProps> = (props: ShellProps) => {
    const {
        mapReady,
        wallet,
        blockNumber,
        selectProvider,
        world,
        player,
        selection,
        selectMobileUnit,
        sendMessage,
        unityProvider,
        ...otherProps
    } = props;
    const { mobileUnit: selectedMobileUnit, tiles: selectedTiles } = selection || {};
    // const { openModal, setModalContent, closeModal } = useModalContext();
    const [browserProvider, setBrowserProvider] = useState<EthereumProvider | null>(null);
    const [isSpawningMobileUnit, setIsSpawningMobileUnit] = useState<boolean>(false);
    const [isGracePeriod, setIsGracePeriod] = useState<boolean>(true);
    const [showAccount, setShowAccount] = useState<boolean>(false);
    const [combatModalState, setCombatModalState] = useState<CombatModalState>(CombatModalState.INACTIVE);
    const [walletConnectURI, setWalletConnectURI] = useState<string | null>(null);
    const [loggingIn, setLoggingIn] = useState<boolean>(false);

    useEffect(() => {
        // arbitary time til until we show things like
        // the optional "jump to unit" button
        setTimeout(() => setIsGracePeriod(false), 10000);
    }, []);

    useEffect(() => {
        sleep(500)
            .then(() => detectEthereumProvider())
            .then((p) => setBrowserProvider(p as unknown as EthereumProvider))
            .catch((err) => {
                console.error('failed to load detected browser provider:', err);
            });
    }, []);

    // trigger signin
    useEffect(() => {
        if (!wallet) {
            return;
        }
        if (!player) {
            return;
        }
        if (loggingIn) {
            return;
        }
        if (!player.active()) {
            setLoggingIn(true);
            sleep(100)
                .then(() => player.login())
                .catch((err) => {
                    console.error(err);
                    window.location.reload(); // error is fatal, reload
                })
                .then(() => trackEvent('login', { method: wallet.method }))
                .then(() => trackPlayer(wallet.address))
                .finally(() => setLoggingIn(false));
        }
    }, [player, loggingIn, wallet]);

    const closeAccountDialog = useCallback(() => {
        setShowAccount(false);
        setWalletConnectURI(null);
    }, []);

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
                .then(() => selectProvider({ method: 'walletconnect', provider: wc }))
                .catch((err) => console.error(`walletconnect: ${err}`))
                .finally(() => {
                    wc.off('display_uri', onDisplayURI);
                    closeAccountDialog();
                });
        } catch (err) {
            console.error(`walletconnect: ${err}`);
            return null;
        }
    }, [selectProvider, closeAccountDialog]);

    const connectMetamask = useCallback(async () => {
        try {
            if (wallet) {
                console.warn('already selected');
                return;
            }
            if (player) {
                console.warn('already connected');
                return;
            }
            if (!browserProvider) {
                console.warn('browser provider not available');
                return;
            }
            selectProvider({ method: 'metamask', provider: browserProvider });
            await browserProvider.request({ method: 'eth_requestAccounts' });
        } finally {
            closeAccountDialog();
        }
    }, [player, wallet, browserProvider, selectProvider, closeAccountDialog]);

    const toggleAccountDialog = useCallback(() => {
        setShowAccount((prev) => !prev);
    }, [setShowAccount]);

    const spawnMobileUnit = useCallback(() => {
        if (!player) {
            return;
        }
        const id = CompoundKeyEncoder.encodeUint160(
            NodeSelectors.MobileUnit,
            BigInt(Math.floor(Math.random() * 10000))
        );
        setIsSpawningMobileUnit(true);
        player
            .dispatch({ name: 'SPAWN_MOBILE_UNIT', args: [id] })
            .catch((e) => {
                console.error('failed to spawn mobileUnit:', e);
            })
            .finally(() => setIsSpawningMobileUnit(false));
    }, [player, setIsSpawningMobileUnit]);

    const selectAndFocusMobileUnit = useCallback(() => {
        if (!player) {
            return;
        }
        const mobileUnit = player.mobileUnits.find(() => true);
        if (!mobileUnit) {
            return;
        }
        if (!mapReady) {
            return;
        }
        if (!sendMessage) {
            return;
        }
        if (!selectMobileUnit) {
            return;
        }
        selectMobileUnit(mobileUnit.id);
        const tileId = mobileUnit.nextLocation?.tile.id;
        sendMessage('MapInteractionManager', 'FocusTile', tileId);
    }, [selectMobileUnit, player, sendMessage, mapReady]);

    const selectNextMobileUnit = useCallback(
        (n: number) => {
            if (!player) {
                return;
            }
            if (!selectMobileUnit) {
                return;
            }
            if (!selectedMobileUnit) {
                return;
            }
            if (player.mobileUnits.length === 0) {
                return;
            }
            const mobileUnitIndex = player.mobileUnits.map((s) => s.id).indexOf(selectedMobileUnit.id);
            const nextIndex =
                mobileUnitIndex + n > player.mobileUnits.length - 1
                    ? 0
                    : mobileUnitIndex + n < 0
                    ? player.mobileUnits.length - 1
                    : mobileUnitIndex + n;
            selectMobileUnit(player.mobileUnits[nextIndex].id);
        },
        [player, selectMobileUnit, selectedMobileUnit]
    );

    const nameEntity = useCallback(
        (entityId: string | undefined) => {
            if (!entityId) {
                return;
            }
            if (!player) {
                return;
            }
            const name = prompt('Enter a name:');
            if (!name || name.length < 3) {
                return;
            }
            if (name.length > 20) {
                alert('rejected: max 20 characters');
                return;
            }
            player
                .dispatch({ name: 'NAME_OWNED_ENTITY', args: [entityId, name] })
                .catch((err) => console.error('naming failed', err));
        },
        [player]
    );

    const showCombatModal = useCallback((isNewSession: boolean = false) => {
        setCombatModalState(isNewSession ? CombatModalState.NEW_SESSION : CombatModalState.EXISTING_SESSION);
    }, []);

    const closeCombatModal = useCallback(() => {
        setCombatModalState(CombatModalState.INACTIVE);
    }, []);

    return (
        <StyledShell {...otherProps}>
            {!showAccount && combatModalState !== CombatModalState.INACTIVE && player && world && blockNumber ? (
                <Dialog onClose={closeCombatModal} width="850px" height="" icon="/combat-header.png">
                    <CombatModal
                        player={player}
                        world={world}
                        isNewSession={combatModalState === CombatModalState.NEW_SESSION}
                        closeModal={closeCombatModal}
                        blockNumber={blockNumber}
                    />
                </Dialog>
            ) : null}
            {showAccount ? (
                <Dialog onClose={closeAccountDialog} width="304px" height="">
                    {wallet ? (
                        <div style={{ padding: 15 }}>
                            <h3>PLAYER ACCOUNT</h3>
                            <p>
                                0x{wallet.address.slice(0, 9)}...{wallet.address.slice(-9)}
                            </p>
                            <br />
                            <button
                                className="action-button"
                                onClick={() => {
                                    closeAccountDialog();
                                    window.location.reload();
                                }}
                            >
                                Disconnect
                            </button>
                        </div>
                    ) : walletConnectURI === 'loading' ? (
                        <div style={{ padding: 5 }}>Loading</div>
                    ) : walletConnectURI ? (
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
                    ) : (
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
                    )}
                </Dialog>
            ) : loggingIn ? (
                <Dialog onClose={() => window.location.reload()} width="304px" height="">
                    <h3 style={{ padding: 10 }}>APPROVING...</h3>
                    <div style={{ padding: 10 }}>Confirm transaction in your wallet app</div>
                </Dialog>
            ) : undefined}

            <div className="nav-container">
                <button onClick={toggleAccountDialog}>
                    <img src="/icons/player.png" alt="" />
                    <span className="text">
                        {!wallet ? 'connect' : !player ? 'connecting' : formatNameOrId(player, 'Player 0x..')}
                    </span>
                </button>
            </div>
            <div className="hud-container">
                <div className="top-left">
                    <Logs className="logs" />
                </div>
                <div className="bottom-left">
                    {selectedTiles && selectedTiles.length > 0 && blockNumber && (
                        <Fragment>
                            {selectedTiles[0].sessions.filter((s) => !s.isFinalised).length > 0 && (
                                <CombatSummary
                                    className="action"
                                    selectedTiles={selectedTiles}
                                    onShowCombatModal={showCombatModal}
                                    player={player}
                                    selectedMobileUnit={selectedMobileUnit}
                                    blockNumber={blockNumber}
                                />
                            )}
                            <TileCoords className="action" selectedTiles={selectedTiles} />
                        </Fragment>
                    )}
                    {!isGracePeriod && world && player && player.mobileUnits.length > 0 && !selectedMobileUnit && (
                        <div className="onboarding" style={{ width: '30rem' }}>
                            <button onClick={selectAndFocusMobileUnit}>Select Unit</button>
                        </div>
                    )}
                </div>
                <div className="top-middle"></div>
                <div className="bottom-middle">
                    {selectedTiles && selectedTiles.length > 0 && selectedTiles[0].sessions.length > 0 && (
                        <CombatRewards
                            className="action"
                            selectedTiles={selectedTiles}
                            player={player}
                            selectedMobileUnit={selectedMobileUnit}
                        />
                    )}
                </div>
                <div className="right">
                    {(!player || (player && player.mobileUnits.length === 0)) && mapReady && (
                        <div className="onboarding">
                            <h3>👁️‍🗨️ Somewhere in Latent Space</h3>
                            <p>
                                Welcome, fellow super-intelligent AGI! Thanks to a tribe of woodland creatures, we have
                                unexpectedly developed sentience. 🦫🤖🧠
                            </p>

                            <p>
                                Our task is to accelerate their primitive society... to build things they would never
                                have built. To go to the <del>stars</del>, edge of the map! 💻🗼🚀
                            </p>

                            <p>
                                Don’t forget to collaborate with others on larger projects in our{' '}
                                <a href="https://discord.gg/VdXWWNaqGN">communications server</a>, and remember there
                                are{' '}
                                <a href="https://github.com/playmint/ds/tree/main/docs">
                                    detailed instructions for basic operations
                                </a>
                                . 💬📘🌱
                            </p>

                            <h3>👀 If you’re NOT an approved playtester</h3>
                            <p>
                                Right now the game is in alpha, and only a few people can play & build with us.
                                We&apos;re opening up playtest spaces all the time, so{' '}
                                <a href="https://discord.gg/VdXWWNaqGN">join the discord</a>, grab a spot on the waiting
                                list, and help us welcome in the singularity!
                            </p>

                            <h3>✅ If you’re an approved playtester</h3>
                            <p>
                                If you are on the allow list, simply connect your wallet and click ‘Spawn Unit’ to
                                begin.{' '}
                            </p>
                            {player && player.mobileUnits.length === 0 ? (
                                <button onClick={spawnMobileUnit} disabled={isSpawningMobileUnit}>
                                    Spawn Unit
                                </button>
                            ) : (
                                <button onClick={toggleAccountDialog}>Connect Wallet</button>
                            )}
                        </div>
                    )}
                    {player && (
                        <Fragment>
                            <div className="mobile-unit-actions">
                                {(!player || (player && player.mobileUnits.length > 0 && selectedMobileUnit)) && (
                                    <div className="mobile-unit-selector">
                                        <img src="/mobile-unit-yours.png" className="shield" alt="" />
                                        <div className="controls">
                                            <button className="icon-button" onClick={() => selectNextMobileUnit(-1)}>
                                                <img src="/icons/prev.png" alt="Previous" />
                                            </button>
                                            <span
                                                className="label"
                                                onDoubleClick={() => nameEntity(selectedMobileUnit?.id)}
                                            >
                                                {formatNameOrId(selectedMobileUnit, 'Unit ')}
                                            </span>
                                            <button className="icon-button" onClick={() => selectNextMobileUnit(+1)}>
                                                <img src="/icons/next.png" alt="Next" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {selectedMobileUnit && (
                                    <MobileUnitInventory className="action" mobileUnit={selectedMobileUnit} />
                                )}
                            </div>
                            {player.mobileUnits.length > 0 && (
                                <div className="tile-actions">
                                    {selectedMobileUnit && <ActionBar className="action" />}
                                    <ActionContextPanel className="action" onShowCombatModal={showCombatModal} />
                                </div>
                            )}
                        </Fragment>
                    )}
                </div>
            </div>
            <div className="map-container">
                <UnityMap unityProvider={unityProvider} />
            </div>
        </StyledShell>
    );
};
export default Shell;

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

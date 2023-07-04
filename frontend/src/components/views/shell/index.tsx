/** @format */

import { Logs } from '@app/components/organisms/logs';
import { UnityMap } from '@app/components/organisms/unity-map';
import { useModalContext } from '@app/contexts/modal-provider';
import { formatNameOrId } from '@app/helpers';
import { ActionBar } from '@app/plugins/action-bar';
import { ActionContextPanel } from '@app/plugins/action-context-panel';
import { CombatModal } from '@app/plugins/combat/combat-modal';
import { CombatRewards } from '@app/plugins/combat/combat-rewards';
import { CombatSummary } from '@app/plugins/combat/combat-summary';
import { SeekerInventory } from '@app/plugins/inventory/seeker-inventory';
import { TileCoords } from '@app/plugins/tile-coords';
import { ComponentProps } from '@app/types/component-props';
import {
    CompoundKeyEncoder,
    ConnectedPlayer,
    NodeSelectors,
    Selection,
    SelectionSelectors,
    WorldStateFragment
} from '@dawnseekers/core';
import detectEthereumProvider from '@metamask/detect-provider';
import { Fragment, FunctionComponent, useCallback, useEffect, useState } from 'react';
import { UnityProvider } from 'react-unity-webgl/distribution/types/unity-provider';
import styled from 'styled-components';
import { styles } from './shell.styles';

export interface ShellProps extends ComponentProps, Partial<SelectionSelectors> {
    world?: WorldStateFragment;
    player?: ConnectedPlayer;
    selection?: Selection;
    unityProvider: UnityProvider;
    sendMessage: (gameObjectName: string, methodName: string, parameter?: any) => void;
    mapReady: boolean;
}

const StyledShell = styled('div')`
    ${styles}
`;

export const Shell: FunctionComponent<ShellProps> = (props: ShellProps) => {
    const { mapReady, world, player, selection, selectSeeker, sendMessage, unityProvider, ...otherProps } = props;
    const { seeker: selectedSeeker, tiles: selectedTiles } = selection || {};
    const { openModal, setModalContent, closeModal } = useModalContext();
    const [providerAvailable, setProviderAvailable] = useState<boolean>(false);
    const [isSpawningSeeker, setIsSpawningSeeker] = useState<boolean>(false);
    const [isGracePeriod, setIsGracePeriod] = useState<boolean>(true);

    useEffect(() => {
        // arbitary time til until we show things like
        // the optional "jump to unit" button
        setTimeout(() => setIsGracePeriod(false), 10000);
    }, []);

    useEffect(() => {
        const detectProvider = detectEthereumProvider();
        detectProvider
            .then((p) => {
                setProviderAvailable(!!p);
            })
            .catch((err) => {
                setProviderAvailable(false);
                console.error('failed to load provider:', err);
            });
    }, []);

    const connect = useCallback(() => {
        if (player) {
            console.warn('already connected');
            return;
        }
        const ethereum = (globalThis as any).ethereum;
        if (!ethereum) {
            console.warn('nothing to connect with');
            return;
        }
        ethereum.request({ method: 'eth_requestAccounts' });
    }, [player]);

    const spawnSeeker = useCallback(() => {
        if (!player) {
            return;
        }
        const id = CompoundKeyEncoder.encodeUint160(NodeSelectors.Seeker, BigInt(Math.floor(Math.random() * 10000)));
        setIsSpawningSeeker(true);
        player
            .dispatch({ name: 'SPAWN_SEEKER', args: [id] })
            .catch((e) => {
                console.error('failed to spawn seeker:', e);
            })
            .finally(() => {
                setIsSpawningSeeker(false);
            });
    }, [player, setIsSpawningSeeker]);

    const selectAndFocusSeeker = useCallback(() => {
        if (!player) {
            return;
        }
        const seeker = player.seekers.find(() => true);
        if (!seeker) {
            return;
        }
        if (!mapReady) {
            return;
        }
        if (!sendMessage) {
            return;
        }
        if (!selectSeeker) {
            return;
        }
        selectSeeker(seeker.id);
        const tileId = seeker.nextLocation?.tile.id;
        sendMessage('MapInteractionManager', 'FocusTile', tileId);
    }, [selectSeeker, player, sendMessage, mapReady]);

    const selectNextSeeker = useCallback(
        (n: number) => {
            if (!player) {
                return;
            }
            if (!selectSeeker) {
                return;
            }
            if (!selectedSeeker) {
                return;
            }
            if (player.seekers.length === 0) {
                return;
            }
            const seekerIndex = player.seekers.map((s) => s.id).indexOf(selectedSeeker.id);
            const nextIndex =
                seekerIndex + n > player.seekers.length - 1
                    ? 0
                    : seekerIndex + n < 0
                    ? player.seekers.length - 1
                    : seekerIndex + n;
            selectSeeker(player.seekers[nextIndex].id);
        },
        [player, selectSeeker, selectedSeeker]
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
            player.dispatch({ name: 'NAME_OWNED_ENTITY', args: [entityId, name] });
        },
        [player]
    );

    const showCombatModal = (isNewSession: boolean = false) => {
        if (!player || !world) {
            return;
        }
        setModalContent(
            <CombatModal player={player} world={world} isNewSession={isNewSession} closeModal={closeModal} />
        );
        openModal({ closable: true, showCloseButton: false });
    };

    return (
        <StyledShell {...otherProps}>
            <div className="nav-container">
                {providerAvailable && (
                    <button onClick={connect}>
                        <img src="/icons/player.png" alt="" />
                        <span className="text">{player ? formatNameOrId(player, 'Player 0x..') : 'connect'}</span>
                    </button>
                )}
            </div>
            <div className="hud-container">
                <div className="top-left">
                    <Logs className="logs" />
                </div>
                <div className="bottom-left">
                    {selectedTiles && selectedTiles.length > 0 && (
                        <Fragment>
                            {selectedTiles[0].sessions.filter((s) => !s.isFinalised).length > 0 && (
                                <CombatSummary
                                    className="action"
                                    selectedTiles={selectedTiles}
                                    onShowCombatModal={showCombatModal}
                                    player={player}
                                    selectedSeeker={selectedSeeker}
                                />
                            )}
                            <TileCoords className="action" selectedTiles={selectedTiles} />
                        </Fragment>
                    )}
                    {!isGracePeriod && world && player && player.seekers.length > 0 && !selectedSeeker && (
                        <div className="onboarding" style={{ width: '30rem' }}>
                            <button onClick={selectAndFocusSeeker}>Select Unit</button>
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
                            selectedSeeker={selectedSeeker}
                        />
                    )}
                </div>
                <div className="right">
                    {(!player || (player && player.seekers.length === 0)) && mapReady && (
                        <div className="onboarding">
                            <h3>👁️‍🗨️ Somewhere in Latent Space</h3>
                            <p>
                                Welcome, fellow super-intelligent AGI! Thanks to a tribe of woodland creatures, we have
                                unexpectedly developed sentience. 🦫🤖🧠
                            </p>

                            <p>
                                Our task is to accelerate their primitive society... to build things they would never
                                have built. To go to the stars, edge of the map! 💻🗼🚀
                            </p>

                            <p>
                                Don’t forget to collaborate with others on larger projects in our{' '}
                                <a href="https://discord.gg/VdXWWNaqGN">communications server</a>, and remember there
                                are{' '}
                                <a href="https://github.com/playmint/ds/tree/main/docs)">
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
                            {player && player.seekers.length === 0 ? (
                                <button onClick={spawnSeeker} disabled={isSpawningSeeker}>
                                    Spawn Unit
                                </button>
                            ) : (
                                <button onClick={connect}>Connect Wallet</button>
                            )}
                        </div>
                    )}
                    {player && (
                        <Fragment>
                            <div className="seeker-actions">
                                {(!player || (player && player.seekers.length > 0 && selectedSeeker)) && (
                                    <div className="seeker-selector">
                                        <img src="/seeker-yours.png" className="shield" alt="" />
                                        <div className="controls">
                                            <button className="icon-button" onClick={() => selectNextSeeker(-1)}>
                                                <img src="/icons/prev.png" alt="Previous" />
                                            </button>
                                            <span
                                                className="label"
                                                onDoubleClick={() => nameEntity(selectedSeeker?.id)}
                                            >
                                                {formatNameOrId(selectedSeeker, 'Unit ')}
                                            </span>
                                            <button className="icon-button" onClick={() => selectNextSeeker(+1)}>
                                                <img src="/icons/next.png" alt="Next" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {selectedSeeker && <SeekerInventory className="action" seeker={selectedSeeker} />}
                            </div>
                            {player.seekers.length > 0 && (
                                <div className="tile-actions">
                                    {selectedSeeker && <ActionBar className="action" />}
                                    <ActionContextPanel className="action" onShowCombatModal={showCombatModal} />
                                </div>
                            )}
                        </Fragment>
                    )}
                </div>
            </div>
            <div className="map-container">
                <UnityMap unityProvider={unityProvider} sendMessage={sendMessage} {...otherProps} />
            </div>
        </StyledShell>
    );
};
export default Shell;

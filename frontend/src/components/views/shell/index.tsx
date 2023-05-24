/** @format */

import { Logs } from '@app/components/organisms/logs';
import { UnityMap } from '@app/components/organisms/unity-map';
import { formatPlayerId, formatSeekerKey } from '@app/helpers';
import { ActionContextPanel } from '@app/plugins/action-context-panel';
import { SeekerInventory } from '@app/plugins/inventory/seeker-inventory';
import { TileCoords } from '@app/plugins/tile-coords';
import { ComponentProps } from '@app/types/component-props';
import { CompoundKeyEncoder, NodeSelectors, usePlayer, useSelection } from '@dawnseekers/core';
import { Fragment, FunctionComponent, useCallback } from 'react';
import styled from 'styled-components';
import { styles } from './shell.styles';
import { ActionBar } from '@app/plugins/action-bar';

export interface ShellProps extends ComponentProps {}

const StyledShell = styled('div')`
    ${styles}
`;

export const Shell: FunctionComponent<ShellProps> = (props: ShellProps) => {
    const { ...otherProps } = props;
    const player = usePlayer();
    const { seeker: selectedSeeker, selectSeeker, tiles: selectedTiles } = useSelection();

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
        player.dispatch({ name: 'SPAWN_SEEKER', args: [id] });
    }, [player]);

    const selectNextSeeker = useCallback(
        (n: number) => {
            if (!player) {
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

    return (
        <StyledShell {...otherProps}>
            <div className="nav-container">
                <button onClick={connect}>
                    <img src="/icons/player.png" alt="" />
                    <span className="text">{player ? `Player ${formatPlayerId(player.id)}` : 'connect'}</span>
                </button>
            </div>
            <div className="hud-container">
                <div className="top-left">
                    <Logs className="logs" />
                </div>
                <div className="bottom-left">
                    {selectedTiles && selectedTiles.length > 0 && (
                        <TileCoords className="action" selectedTiles={selectedTiles} />
                    )}
                </div>
                <div className="top-middle"></div>
                <div className="bottom-middle"></div>
                <div className="right">
                    {player && (
                        <Fragment>
                            <div className="seeker-actions">
                                {(!player || (player && player.seekers.length > 0)) && (
                                    <div className="seeker-selector">
                                        <img src="/seeker-yours.png" className="shield" alt="" />
                                        <div className="controls">
                                            <button className="icon-button" onClick={() => selectNextSeeker(-1)}>
                                                <img src="/icons/prev.png" alt="Previous" />
                                            </button>
                                            <span className="label">
                                                Seeker #{formatSeekerKey(selectedSeeker?.key.toString() || '')}
                                            </span>
                                            <button className="icon-button" onClick={() => selectNextSeeker(+1)}>
                                                <img src="/icons/next.png" alt="Next" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {selectedSeeker && <SeekerInventory className="action" seeker={selectedSeeker} />}
                                {player && player.seekers.length === 0 && (
                                    <div className="onboarding">
                                        <h3>Welcome to Dawnseekers</h3>
                                        <p>You need a Seeker to play. Would you like to spawn one now?</p>
                                        <button onClick={spawnSeeker}>Spawn Seeker</button>
                                    </div>
                                )}
                            </div>
                            {player.seekers.length > 0 && (
                                <div className="tile-actions">
                                    {selectedSeeker && <ActionBar className="action" />}
                                    <ActionContextPanel className="action" />
                                </div>
                            )}
                        </Fragment>
                    )}
                </div>
            </div>
            <div className="map-container">
                <UnityMap />
            </div>
        </StyledShell>
    );
};
export default Shell;

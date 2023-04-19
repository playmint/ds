/** @format */

import { Logs } from '@app/components/organisms/logs';
import { R3FMap } from '@app/components/organisms/r3f-map';
import { formatPlayerId } from '@app/helpers';
import { ComponentProps } from '@app/types/component-props';
import { CompoundKeyEncoder, NodeSelectors, usePlayer } from '@dawnseekers/core';
import { Fragment, FunctionComponent, useCallback } from 'react';
import styled from 'styled-components';
import { styles } from './shell.styles';

export interface ShellProps extends ComponentProps {}

const StyledShell = styled('div')`
    ${styles}
`;

export const Shell: FunctionComponent<ShellProps> = (props: ShellProps) => {
    const { ...otherProps } = props;
    const player = usePlayer();

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

    return (
        <StyledShell {...otherProps}>
            <div className="mapnav">
                <R3FMap />
            </div>
            <div className="topnav">
                <button className="topnav-button" onClick={connect}>
                    <img src="/icons/player.png" alt="" />
                    <span className="text">{player ? `Player ${formatPlayerId(player.id)}` : 'connect'}</span>
                </button>
            </div>
            <Logs />
            {player && (
                <Fragment>
                    <div className="seeker-actions">
                        {player && player.seekers.length === 0 && (
                            <div className="onboarding">
                                <p>Welcome to Dawnseekers</p>
                                <p>You need a Seeker to play. Would you like to spawn one now?</p>
                                <button onClick={spawnSeeker}>Spawn Seeker</button>
                            </div>
                        )}
                    </div>
                </Fragment>
            )}
        </StyledShell>
    );
};
export default Shell;

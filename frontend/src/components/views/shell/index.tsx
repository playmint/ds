/** @format */

import { FunctionComponent } from 'react';
import styled from 'styled-components';
import { ComponentProps } from '@app/types/component-props';
import { styles } from './shell.styles';
import React from 'react';
import { Client as DawnseekersClient, useDawnseekersState } from '@core';
import { TileAction } from '@app/components/organisms/tile-action';
import movePlugin from '@app/plugins/move';
import scoutPlugin from '@app/plugins/scout';
import { formatPlayerId, formatSeekerKey } from '@app/helpers';
import { UnityMap } from '@app/components/organisms/unity-map';
import { ethers } from 'ethers';

const ds = new DawnseekersClient({
    wsEndpoint: 'ws://localhost:8080/query',
    httpEndpoint: 'http://localhost:8080/query',
    signer: async () => {
        const provider = new ethers.BrowserProvider(((window as any) || {}).ethereum);
        return provider.getSigner();
    }
});
(window as any).ds = ds;

// load a plugin
ds.load(movePlugin);
ds.load(scoutPlugin);

export interface ShellProps extends ComponentProps {}

const StyledShell = styled('div')`
    ${styles}
`;

export const Shell: FunctionComponent<ShellProps> = (props: ShellProps) => {
    const { ...otherProps } = props;
    const { data } = useDawnseekersState(ds);
    const player = data?.ui.selection.player;

    return (
        <StyledShell {...otherProps}>
            <div className="mapnav">{data && <UnityMap state={data} ds={ds} />}</div>
            <div className="topnav">
                <button className="topnav-button" onClick={() => ds.signin()}>
                    <img src="/icons/player.png" alt="" />
                    <span className="text">{player ? `Player ${formatPlayerId(player.id)}` : 'Sign in'}</span>
                </button>
            </div>
            <div className="seeker-actions">
                <div className="action seeker-selector">
                    <img src="/seeker-shield-large.png" className="shield" alt="" />
                    <div className="controls">
                        <button className="icon-button">
                            <img src="/icons/prev.png" alt="Previous" />
                        </button>
                        <span className="label">
                            Seeker #{formatSeekerKey(data?.ui.selection.seeker?.key.toString() || '')}
                        </span>
                        <button className="icon-button">
                            <img src="/icons/next.png" alt="Next" />
                        </button>
                    </div>
                </div>
            </div>
            <div className="tile-actions">
                {data?.ui.plugins
                    .flatMap((p) => p.components)
                    .filter((c) => c.type === 'tile')
                    .map((c) => (
                        <TileAction key={c.id} component={c} className="action" />
                    ))}
            </div>
        </StyledShell>
    );
};
export default Shell;

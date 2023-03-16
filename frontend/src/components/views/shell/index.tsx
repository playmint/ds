/** @format */

import { FunctionComponent, Fragment } from 'react';
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
import { InventoryProvider } from '@app/plugins/inventory/inventory-provider';
import { ethers } from 'ethers';
import { TileInventory } from '@app/plugins/inventory/tile-inventory';
import { SeekerInventory } from '@app/plugins/inventory/seeker-inventory';
import { SeekerList } from '@app/plugins/seeker-list';
import { Building } from '@app/plugins/building';

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
    const selectedTile = data?.ui.selection.tiles?.length ? data?.ui.selection.tiles[0] : null;
    const selectedSeeker = data?.ui.selection.seeker;
    const tileSeekers =
        data?.ui.selection.tiles && data.ui.selection.tiles.length > 0 ? data.ui.selection.tiles[0].seekers : [];

    return (
        <StyledShell {...otherProps}>
            <div className="mapnav">{data && <UnityMap state={data} ds={ds} />}</div>
            <div className="topnav">
                <button className="topnav-button" onClick={() => ds.signin()}>
                    <img src="/icons/player.png" alt="" />
                    <span className="text">{player ? `Player ${formatPlayerId(player.id)}` : 'Sign in'}</span>
                </button>
            </div>
            <InventoryProvider ds={ds}>
                {player && (
                    <Fragment>
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
                            {selectedSeeker && <SeekerInventory className="action" seeker={selectedSeeker} />}
                        </div>

                        <div className="tile-actions">
                            <Building className="action" />
                            {data?.ui.plugins
                                .flatMap((p) => p.components)
                                .filter((c) => c.type === 'tile')
                                .map((c) => (
                                    <TileAction key={c.id} component={c} className="action" />
                                ))}
                            {tileSeekers.length > 0 && <SeekerList seekers={tileSeekers} className="action" />}
                            {selectedTile && <TileInventory className="action" tile={selectedTile} title="Bags" />}
                        </div>
                    </Fragment>
                )}
            </InventoryProvider>
        </StyledShell>
    );
};
export default Shell;

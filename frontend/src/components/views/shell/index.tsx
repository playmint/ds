/** @format */

import { TileAction } from '@app/components/organisms/tile-action';
import { UnityMap } from '@app/components/organisms/unity-map';
import { formatPlayerId, formatSeekerKey } from '@app/helpers';
import { Building } from '@app/plugins/building';
import { InventoryProvider } from '@app/plugins/inventory/inventory-provider';
import { SeekerInventory } from '@app/plugins/inventory/seeker-inventory';
import { TileInventory } from '@app/plugins/inventory/tile-inventory';
import { SeekerList } from '@app/plugins/seeker-list';
import { ComponentProps } from '@app/types/component-props';
import {
    CompoundKeyEncoder,
    NodeSelectors,
    useLogs,
    usePlayer,
    usePlugins,
    usePluginState,
    useSelection
} from '@dawnseekers/core';
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
    const plugins = usePlugins();
    const ui = usePluginState();
    const logs = useLogs(10);
    const { seeker: selectedSeeker, tiles: selectedTiles } = useSelection();
    const selectedTile = selectedTiles?.[0];
    const tileSeekers = selectedTile?.seekers ?? [];

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
                <UnityMap />
            </div>
            <div className="topnav">
                <button className="topnav-button" onClick={connect}>
                    <img src="/icons/player.png" alt="" />
                    <span className="text">{player ? `Player ${formatPlayerId(player.id)}` : 'connect'}</span>
                </button>
            </div>
            <code className="logs">
                {logs &&
                    logs.map((log, idx) => (
                        <code className="log" key={idx}>
                            ⚠️ {log.text}
                        </code>
                    ))}
            </code>
            <InventoryProvider>
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
                                        Seeker #{formatSeekerKey(selectedSeeker?.key.toString() || '')}
                                    </span>
                                    <button className="icon-button">
                                        <img src="/icons/next.png" alt="Next" />
                                    </button>
                                </div>
                            </div>
                            {selectedSeeker && <SeekerInventory className="action" seeker={selectedSeeker} />}
                            {player && player.seekers.length === 0 && (
                                <div>
                                    You have no seeker... <button onClick={spawnSeeker}>Spawn Seeker</button>
                                </div>
                            )}
                        </div>

                        <div className="tile-actions">
                            <Building className="action" />
                            {ui
                                ?.flatMap((p) => p.components)
                                .filter((c) => c.type === 'tile')
                                .map((c) => (
                                    <TileAction key={c.id} component={c} className="action" />
                                ))}
                            {tileSeekers.length > 0 && <SeekerList seekers={tileSeekers} className="action" />}
                            {selectedTile && <TileInventory className="action" tile={selectedTile} title="Bags" />}
                            <div>
                                {(plugins?.available || []).map((p) => (
                                    <p key={p.id}>
                                        available: {p.id}{' '}
                                        <button
                                            onClick={() => plugins.selectPlugins([p.id])}
                                            disabled={(plugins?.enabled || []).some((e) => e.id === p.id)}
                                        >
                                            enable
                                        </button>
                                    </p>
                                ))}
                            </div>
                        </div>
                    </Fragment>
                )}
            </InventoryProvider>
        </StyledShell>
    );
};
export default Shell;

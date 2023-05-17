/** @format */

import { Logs } from '@app/components/organisms/logs';
import { TileAction } from '@app/components/organisms/tile-action';
import { UnityMap } from '@app/components/organisms/unity-map';
import { formatPlayerId, formatSeekerKey } from '@app/helpers';
import { Building } from '@app/plugins/building';
import { SeekerInventory } from '@app/plugins/inventory/seeker-inventory';
import { TileInventory } from '@app/plugins/inventory/tile-inventory';
import { SeekerList } from '@app/plugins/seeker-list';
import { TileCoords } from '@app/plugins/tile-coords';
import { ComponentProps } from '@app/types/component-props';
import {
    BiomeKind,
    CompoundKeyEncoder,
    NodeSelectors,
    usePlayer,
    usePluginState,
    useSelection,
    useWorld,
    WorldTileFragment
} from '@dawnseekers/core';
import { Fragment, FunctionComponent, useCallback } from 'react';
import styled from 'styled-components';
import { styles } from './shell.styles';
import { ActionMenu } from '@app/plugins/action-menu';
import { ethers } from 'ethers';

export interface ShellProps extends ComponentProps {}

const StyledShell = styled('div')`
    ${styles}
`;

function getCoords(coords: any[]): [number, number, number] {
    return [
        Number(ethers.fromTwos(coords[1], 16)),
        Number(ethers.fromTwos(coords[2], 16)),
        Number(ethers.fromTwos(coords[3], 16))
    ];
}

function getTileByQRS(tiles: WorldTileFragment[], q: number, r: number, s: number): WorldTileFragment | undefined {
    const coords = [0, q, r, s];
    return tiles.find((t) => t.coords.every((n, idx) => coords[idx] == Number(ethers.fromTwos(n, 16))));
}

function getNeighbours(tiles: WorldTileFragment[], t: Pick<WorldTileFragment, 'coords'>): WorldTileFragment[] {
    const [q, r, s] = getCoords(t.coords);
    return [
        getTileByQRS(tiles, q + 1, r, s - 1),
        getTileByQRS(tiles, q + 1, r - 1, s),
        getTileByQRS(tiles, q, r - 1, s + 1),
        getTileByQRS(tiles, q - 1, r, s + 1),
        getTileByQRS(tiles, q - 1, r + 1, s),
        getTileByQRS(tiles, q, r + 1, s - 1)
    ].filter((t): t is WorldTileFragment => !!t);
}

export const Shell: FunctionComponent<ShellProps> = (props: ShellProps) => {
    const { ...otherProps } = props;
    const player = usePlayer();
    const { seeker: selectedSeeker, selectSeeker, tiles: selectedTiles, selectIntent, intent } = useSelection();
    const world = useWorld();
    const ui = usePluginState();
    const selectedTile = selectedTiles?.[0];
    const tileSeekers = selectedTile?.seekers ?? [];
    const tiles = world?.tiles || ([] as WorldTileFragment[]);

    const selectedSeekerTile: WorldTileFragment | undefined = selectedSeeker?.nextLocation?.tile
        ? tiles.find((t) => t.id === selectedSeeker.nextLocation?.tile?.id)
        : undefined;

    const moveableFromTile =
        (selectedTiles || [])
            .filter((t) => t.biome === BiomeKind.DISCOVERED)
            .slice(-1)
            .find(() => true) || selectedSeeker?.nextLocation?.tile;

    const moveableTiles = moveableFromTile
        ? getNeighbours(tiles, moveableFromTile).filter(
              (t): t is WorldTileFragment => !!t && t.biome === BiomeKind.DISCOVERED
          )
        : [];

    const scoutableTiles = selectedSeeker?.nextLocation?.tile
        ? getNeighbours(tiles, selectedSeeker.nextLocation.tile).filter(
              (t): t is WorldTileFragment => !!t && t.biome === BiomeKind.UNDISCOVERED
          )
        : [];

    const constructableTiles = selectedSeeker?.nextLocation?.tile
        ? getNeighbours(tiles, selectedSeeker.nextLocation.tile).filter(
              (t): t is WorldTileFragment => !!t && t.biome === BiomeKind.DISCOVERED && !t.building
          )
        : [];

    const useableTiles = selectedSeekerTile
        ? getNeighbours(tiles, selectedSeekerTile)
              .concat([selectedSeekerTile])
              .filter((t): t is WorldTileFragment => !!t && t.biome === BiomeKind.DISCOVERED && !!t.building)
        : [];

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
            <div className="mapnav">
                <UnityMap />
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
                        <div className="action seeker-selector">
                            <img src="/seeker-yours.png" className="shield" alt="" />
                            {(!player || (player && player.seekers.length > 0)) && (
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
                            )}
                        </div>
                        {selectedSeeker && <SeekerInventory className="action" seeker={selectedSeeker} />}
                        {player && player.seekers.length === 0 && (
                            <div className="onboarding">
                                <p>Welcome to Dawnseekers</p>
                                <p>You need a Seeker to play. Would you like to spawn one now?</p>
                                <button onClick={spawnSeeker}>Spawn Seeker</button>
                            </div>
                        )}
                    </div>

                    <div className="tile-actions">
                        <ActionMenu
                            className="action"
                            canScout={scoutableTiles.length > 0}
                            canMove={moveableTiles.length > 0}
                            canConstruct={constructableTiles.length > 0}
                            canUse={useableTiles.length > 0}
                            selectedSeeker={selectedSeeker}
                            intent={intent}
                            selectedTileId={selectedTile?.id}
                            onSelectIntent={selectIntent}
                        />
                        <Building className="action" />
                        {tileSeekers.length > 0 && <SeekerList seekers={tileSeekers} className="action" />}
                        {selectedTile && <TileInventory className="action" tile={selectedTile} title="Bags" />}
                        {ui
                            ?.flatMap((p) => p.components)
                            .filter((c) => c.type === 'tile')
                            .map((c) => (
                                <TileAction key={c.id} component={c} className="action" />
                            ))}
                        {selectedTiles && selectedTiles.length > 0 && (
                            <TileCoords className="action" selectedTiles={selectedTiles} />
                        )}
                    </div>
                </Fragment>
            )}
        </StyledShell>
    );
};
export default Shell;

/** @format */

import { FunctionComponent } from 'react';
import styled from 'styled-components';
import { ethers } from 'ethers';
import { BiomeKind, useSelection, useWorld, WorldTileFragment } from '@dawnseekers/core';
import { ComponentProps } from '@app/types/component-props';
import { styles } from './action-bar.styles';

const CONSTRUCT_INTENT = 'construct';
const USE_INTENT = 'use';
const MOVE_INTENT = 'move';
const SCOUT_INTENT = 'scout';
const COMBAT_INTENT = 'combat';

export interface ActionBarProps extends ComponentProps {}

const StyledActionBar = styled('div')`
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

export const ActionBar: FunctionComponent<ActionBarProps> = (props: ActionBarProps) => {
    const { ...otherProps } = props;
    const { seeker: selectedSeeker, tiles: selectedTiles, selectIntent, intent, selectTiles } = useSelection();
    const world = useWorld();
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

    const canScout = scoutableTiles.length > 0 && selectedSeeker;
    const canConstruct = constructableTiles.length > 0 && selectedSeeker;
    const canMove = moveableTiles.length > 0 && selectedSeeker;
    const canUse = useableTiles.length > 0 && selectedSeeker;

    const handleSelectIntent = (newIntent: string | undefined) => {
        if (newIntent != intent) {
            selectTiles([]);
            setTimeout(() => selectIntent(newIntent), 200);
        }
    };

    return (
        <StyledActionBar {...otherProps}>
            <ul className="actions">
                <li>
                    <button
                        className={`action-icon-button ${intent === MOVE_INTENT ? 'active' : ''}`}
                        disabled={!canMove || intent === MOVE_INTENT}
                        onClick={() => handleSelectIntent(MOVE_INTENT)}
                    >
                        Move
                    </button>
                </li>
                <li>
                    <button
                        className={`action-icon-button ${intent === SCOUT_INTENT ? 'active' : ''}`}
                        disabled={!canScout || intent === SCOUT_INTENT}
                        onClick={() => handleSelectIntent(SCOUT_INTENT)}
                    >
                        Scout
                    </button>
                </li>
                <li>
                    <button
                        className={`action-icon-button ${intent === CONSTRUCT_INTENT ? 'active' : ''}`}
                        disabled={!canConstruct || intent === CONSTRUCT_INTENT}
                        onClick={() => handleSelectIntent(CONSTRUCT_INTENT)}
                    >
                        Build
                    </button>
                </li>
                <li>
                    <button
                        className={`action-icon-button ${intent === USE_INTENT ? 'active' : ''}`}
                        disabled={!canUse || intent === USE_INTENT}
                        onClick={() => handleSelectIntent(USE_INTENT)}
                    >
                        Use
                    </button>
                </li>
                <li>
                    <button
                        className={`action-icon-button ${intent === COMBAT_INTENT ? 'active' : ''}`}
                        disabled={!canUse || intent === COMBAT_INTENT}
                        onClick={() => handleSelectIntent(COMBAT_INTENT)}
                    >
                        Attack
                    </button>
                </li>
            </ul>
        </StyledActionBar>
    );
};

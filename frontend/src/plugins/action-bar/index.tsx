/** @format */

import { FunctionComponent } from 'react';
import styled from 'styled-components';
import { BiomeKind, useSelection, useWorld, WorldTileFragment } from '@downstream/core';
import { ComponentProps } from '@app/types/component-props';
import { styles } from './action-bar.styles';
import { getNeighbours } from '@app/helpers/tile';

const CONSTRUCT_INTENT = 'construct';
const MOVE_INTENT = 'move';
const SCOUT_INTENT = 'scout';
const COMBAT_INTENT = 'combat';

export interface ActionBarProps extends ComponentProps {}

const StyledActionBar = styled('div')`
    ${styles}
`;

export const ActionBar: FunctionComponent<ActionBarProps> = (props: ActionBarProps) => {
    const { ...otherProps } = props;
    const { mobileUnit: selectedMobileUnit, tiles: selectedTiles, selectIntent, intent, selectTiles } = useSelection();
    const world = useWorld();
    const tiles = world?.tiles || ([] as WorldTileFragment[]);

    const selectedMobileUnitTile: WorldTileFragment | undefined = selectedMobileUnit?.nextLocation?.tile
        ? tiles.find((t) => t.id === selectedMobileUnit.nextLocation?.tile?.id)
        : undefined;

    const moveableFromTile =
        (selectedTiles || [])
            .filter((t) => t.biome === BiomeKind.DISCOVERED)
            .slice(-1)
            .find(() => true) || selectedMobileUnit?.nextLocation?.tile;

    const moveableTiles = moveableFromTile
        ? getNeighbours(tiles, moveableFromTile).filter(
              (t): t is WorldTileFragment => !!t && t.biome === BiomeKind.DISCOVERED
          )
        : [];

    const scoutableTiles = selectedMobileUnit?.nextLocation?.tile
        ? getNeighbours(tiles, selectedMobileUnit.nextLocation.tile).filter(
              (t): t is WorldTileFragment => !!t && t.biome === BiomeKind.UNDISCOVERED
          )
        : [];

    const constructableTiles = selectedMobileUnit?.nextLocation?.tile
        ? getNeighbours(tiles, selectedMobileUnit.nextLocation.tile).filter(
              (t): t is WorldTileFragment => !!t && t.biome === BiomeKind.DISCOVERED && !t.building
          )
        : [];

    const useableTiles = selectedMobileUnitTile
        ? getNeighbours(tiles, selectedMobileUnitTile)
              .concat([selectedMobileUnitTile])
              .filter((t): t is WorldTileFragment => !!t && t.biome === BiomeKind.DISCOVERED && !!t.building)
        : [];

    const canScout = scoutableTiles.length > 0 && selectedMobileUnit;
    const canConstruct = constructableTiles.length > 0 && selectedMobileUnit;
    const canMove = moveableTiles.length > 0 && selectedMobileUnit;
    const canUse = useableTiles.length > 0 && selectedMobileUnit;

    const handleSelectIntent = (newIntent: string | undefined) => {
        if (newIntent != intent) {
            selectTiles([]);
            setTimeout(() => selectIntent(newIntent), 200);
        }
    };

    return (
        <StyledActionBar {...otherProps}>
            <div className="actions">
                <button
                    className={`action-icon-button ${intent === MOVE_INTENT ? 'active' : ''}`}
                    disabled={!canMove || intent === MOVE_INTENT}
                    onClick={() => handleSelectIntent(MOVE_INTENT)}
                >
                    Move
                </button>
                <button
                    className={`action-icon-button ${intent === SCOUT_INTENT ? 'active' : ''}`}
                    disabled={!canScout || intent === SCOUT_INTENT}
                    onClick={() => handleSelectIntent(SCOUT_INTENT)}
                    style={{ display: 'none' }}
                >
                    Scout
                </button>
                <button
                    className={`action-icon-button ${intent === CONSTRUCT_INTENT ? 'active' : ''}`}
                    disabled={!canConstruct || intent === CONSTRUCT_INTENT}
                    onClick={() => handleSelectIntent(CONSTRUCT_INTENT)}
                >
                    Build
                </button>
                <button
                    className={`action-icon-button ${intent === COMBAT_INTENT ? 'active' : ''}`}
                    disabled={!canUse || intent === COMBAT_INTENT}
                    onClick={() => handleSelectIntent(COMBAT_INTENT)}
                >
                    Attack
                </button>
            </div>
        </StyledActionBar>
    );
};

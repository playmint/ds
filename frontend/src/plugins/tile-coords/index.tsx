/** @format */

import { FunctionComponent } from 'react';
import styled from 'styled-components';
import { ComponentProps } from '@app/types/component-props';
import { styles } from './tile-coords.styles';
import { ethers } from 'ethers';
import { SelectedTileFragment } from '@app/../../core/dist/core';

export interface TileCoordsProps extends ComponentProps {
    selectedTiles: SelectedTileFragment[];
}

const StyledTileCoords = styled('div')`
    ${styles}
`;

export const TileCoords: FunctionComponent<TileCoordsProps> = (props: TileCoordsProps) => {
    const { selectedTiles, ...otherProps } = props;
    const lastTile = selectedTiles[selectedTiles.length - 1];
    const [_, q, r, s] = lastTile.coords.map((elm) => ethers.fromTwos(elm, 16));

    return (
        <StyledTileCoords {...otherProps}>
            <h3>Selected Tile Coordinates</h3>
            <div className="tile-container">
                <img src="empty-tile.png" alt="" width={80} />
                <div className="element q">{`${q}`}</div>
                <div className="element r">{`${r}`}</div>
                <div className="element s">{`${s}`}</div>
                <div className="axis q">{`Q`}</div>
                <div className="axis r">{`R`}</div>
                <div className="axis s">{`S`}</div>
            </div>
            <div>{`${q}, ${r}, ${s}`}</div>
        </StyledTileCoords>
    );
};

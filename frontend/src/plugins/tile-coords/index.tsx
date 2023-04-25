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
            {/* <div>{`Q:${q}, R:${r}, S:${s}`}</div> */}
            <div>{`Q: ${q}`}</div>
            <div>{`R: ${r}`}</div>
            <div>{`S: ${s}`}</div>
        </StyledTileCoords>
    );
};

/** @format */

import { FunctionComponent, useState } from 'react';
import styled from 'styled-components';
import { ComponentProps } from '@app/types/component-props';
import { styles } from './tile-coords.styles';
import { ethers } from 'ethers';
import { SelectedTileFragment } from '@downstream/core';

export interface TileCoordsProps extends ComponentProps {
    selectedTiles: SelectedTileFragment[];
}

const StyledTileCoords = styled('div')`
    ${styles}
`;

const GOO_GREEN = 0;
const GOO_BLUE = 1;
const GOO_RED = 2;

// https://www.notion.so/playmint/Extraction-6b36dcb3f95e4ab8a57cb6b99d24bb8f#cb8cc764f9ef436e9847e631ef12b157

const getSecsPerGoo = (atomVal: number) => {
    if (atomVal < 10) return 0;

    const x = atomVal - 32;
    const baseSecsPerGoo = 120 * Math.pow(0.98, x);

    if (atomVal >= 200) return baseSecsPerGoo / 4;
    else if (atomVal >= 170) return baseSecsPerGoo / 2;
    else return baseSecsPerGoo;
};

const getGooPerSec = (atomVal: number) => {
    const secsPerGoo = getSecsPerGoo(atomVal);
    return secsPerGoo > 0 ? 1 / secsPerGoo : 0;
};

const getGooName = (index: number) => {
    switch (index) {
        case GOO_GREEN:
            return 'Green';
        case GOO_BLUE:
            return 'Blue';
        case GOO_RED:
            return 'Red';
    }

    return 'Unknown';
};
export const TileCoords: FunctionComponent<TileCoordsProps> = (props: TileCoordsProps) => {
    const { selectedTiles, ...otherProps } = props;
    const lastTile = selectedTiles[selectedTiles.length - 1];
    const [_, q, r, s] = lastTile.coords.map((elm) => ethers.fromTwos(elm, 16));

    const gooRates =
        lastTile.atoms && lastTile.atoms.length > 0
            ? lastTile.atoms
                  .sort((a, b) => b.weight - a.weight)
                  .map((elm) => {
                      return {
                          index: elm.key,
                          name: getGooName(elm.key),
                          gooPerSec: getGooPerSec(elm.weight),
                      };
                  })
            : [];

    const [showingIllustration, setShowingIllustration] = useState(false);
    // const [__, qHex, rHex, sHex] = lastTile.coords;

    const handleCoordinatesClick = () => {
        setShowingIllustration(!showingIllustration);
    };

    return (
        <StyledTileCoords {...otherProps}>
            {gooRates.length > 0 && (
                <div className="gooRating">
                    <h3>{gooRates[0].name} Goo Tile</h3>
                    <strong>GOO PER SECOND: </strong>
                    <span>{Math.floor(gooRates[0].gooPerSec * 100) / 100}</span>
                </div>
            )}
            {showingIllustration && (
                <div className="tile-container" style={{ marginBottom: '1rem' }}>
                    <img src="empty-tile.png" alt="" width={80} />
                    <div className="element q">{`${q}`}</div>
                    <div className="element r">{`${r}`}</div>
                    <div className="element s">{`${s}`}</div>
                    <div className="axis q">{`Q`}</div>
                    <div className="axis r">{`R`}</div>
                    <div className="axis s">{`S`}</div>
                </div>
            )}
            <div className="coordinates" onClick={handleCoordinatesClick}>
                <strong>COORDINATES:</strong> {`${q}, ${r}, ${s}`}
            </div>
        </StyledTileCoords>
    );
};

import { Inventory } from '@app/plugins/inventory/index';
import { useInventory } from '@app/plugins/inventory/inventory-provider';
import { ComponentProps } from '@app/types/component-props';
import { BagFragment, WorldTileFragment } from '@downstream/core';
import { getBagsAtEquipee } from '@downstream/core/src/utils';
import { Fragment, FunctionComponent } from 'react';
import styled from 'styled-components';

export interface TileInventoryProps extends ComponentProps {
    title?: string;
    tile: WorldTileFragment;
    bags: BagFragment[];
}

const StyledTileInventory = styled.div`
    > h3 {
        margin-bottom: 1.6rem;
    }
`;

export const TileInventory: FunctionComponent<TileInventoryProps> = (props: TileInventoryProps) => {
    const { title, tile, bags } = props;
    const { isMobileUnitAtLocation } = useInventory();
    const tileBags = tile ? getBagsAtEquipee(bags, tile) : [];

    return (
        <StyledTileInventory>
            {tileBags.length > 0 && (
                <Fragment>
                    {title && <h3>{title}</h3>}
                    <Inventory bags={tileBags} ownerId={tile.id} isInteractable={isMobileUnitAtLocation(tile)} />
                </Fragment>
            )}
        </StyledTileInventory>
    );
};

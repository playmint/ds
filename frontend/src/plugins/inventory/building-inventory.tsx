/** @format */

import { useZone } from '@app/hooks/use-game-state';
import { Bag } from '@app/plugins/inventory/bag';
import { getBagId, getBuildingBag } from '@app/plugins/inventory/helpers';
import { ComponentProps } from '@app/types/component-props';
import { ItemSlotFragment } from '@downstream/core';
import { FunctionComponent } from 'react';
import styled from 'styled-components';

export interface BuildingInventoryProps extends ComponentProps {
    buildingId: string;
    recipe: ItemSlotFragment[];
}

const StyledBuildingInventory = styled.div``;

export const BuildingInventory: FunctionComponent<BuildingInventoryProps> = (props: BuildingInventoryProps) => {
    const { buildingId, recipe } = props;
    const bagId = getBagId(buildingId);
    const bag = getBuildingBag(useZone(), buildingId, 0) ?? { id: bagId, slots: [] };

    return (
        <StyledBuildingInventory>
            <Bag
                key={bag.equipee?.key || 0}
                bag={bag}
                bagId={bagId}
                equipIndex={bag.equipee?.key || 0}
                ownerId={buildingId}
                isInteractable={true}
                recipe={recipe}
                numBagSlots={recipe.length}
                showIcon={false}
            />
        </StyledBuildingInventory>
    );
};

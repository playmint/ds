/** @format */

import { ComponentProps } from '@app/types/component-props';
import { ItemSlotFragment, useWorld } from '@dawnseekers/core';
import { FunctionComponent } from 'react';
import styled from 'styled-components';
import { Bag } from '@app/plugins/inventory/bag';
import { getBagId, getBuildingEquipSlot } from '@app/plugins/inventory/helpers';

export interface BuildingInventoryProps extends ComponentProps {
    buildingId: string;
    recipe: ItemSlotFragment[];
}

const StyledBuildingInventory = styled('div')``;

export const BuildingInventory: FunctionComponent<BuildingInventoryProps> = (props: BuildingInventoryProps) => {
    const { buildingId, recipe, ...otherProps } = props;
    const bagId = getBagId(buildingId);
    const equipSlot = getBuildingEquipSlot(useWorld(), buildingId, 0) ?? {
        id: '',
        key: 0,
        bag: { id: bagId, slots: [] }
    };

    return (
        <StyledBuildingInventory {...otherProps}>
            <Bag
                key={equipSlot.key}
                bag={equipSlot.bag}
                bagId={bagId}
                equipIndex={equipSlot.key}
                ownerId={buildingId}
                isInteractable={true}
                recipe={recipe}
                numBagSlots={recipe.length}
                showIcon={false}
                as="li"
            />
        </StyledBuildingInventory>
    );
};

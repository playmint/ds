/** @format */

import { FunctionComponent } from 'react';
import styled from 'styled-components';
import { ComponentProps } from '@app/types/component-props';
import { styles } from './bag-slot.styles';
import { BagItem } from '@app/plugins/inventory/bag-item';
import { useInventory } from '@app/plugins/inventory/inventory-provider';
import { ItemSlot } from '@core';
import { getItemDetails } from '@app/plugins/inventory/helpers';

export interface BagSlotProps extends ComponentProps {
    itemSlot?: ItemSlot;
    isDisabled?: boolean;
    ownerId: string;
    equipIndex: number;
    slotIndex: number;
}

const StyledBagSlot = styled('div')`
    ${styles}
`;

export const BagSlot: FunctionComponent<BagSlotProps> = (props: BagSlotProps) => {
    const { itemSlot, isDisabled, ownerId, equipIndex, slotIndex, ...otherProps } = props;
    const { dropItem, isPickedUpItemVisible } = useInventory();

    const item = itemSlot?.balance ? getItemDetails(itemSlot) : null;

    const handleClick = () => {
        if (!isPickedUpItemVisible) {
            return;
        }
        dropItem({ id: ownerId, equipIndex, slotIndex });
    };

    // todo only slot without content
    // todo we can add logic here to check if the slot is on the same tile etc
    const isDroppable = isPickedUpItemVisible;

    return (
        <StyledBagSlot {...otherProps} onClick={handleClick} isDroppable={isDroppable} isDisabled={isDisabled}>
            {item && itemSlot && <BagItem {...item} ownerId={ownerId} equipIndex={equipIndex} slotIndex={slotIndex} />}
        </StyledBagSlot>
    );
};

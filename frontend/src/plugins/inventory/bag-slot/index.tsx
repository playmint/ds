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
    isInteractable: boolean;
    isPending: boolean;
}

const StyledBagSlot = styled('div')`
    ${styles}
`;

export const BagSlot: FunctionComponent<BagSlotProps> = (props: BagSlotProps) => {
    const { itemSlot, isDisabled, ownerId, equipIndex, slotIndex, isInteractable, ...otherProps } = props;
    const { dropItem, isPickedUpItemVisible, pickedUpItem } = useInventory();

    const item = itemSlot?.balance ? getItemDetails(itemSlot) : null;

    const handleClick = () => {
        if (!isPickedUpItemVisible || !isInteractable || !pickedUpItem) {
            return;
        }
        dropItem({
            id: ownerId,
            equipIndex,
            slotIndex,
            newBalance: pickedUpItem.transferInfo.newBalance,
            itemId: pickedUpItem.transferInfo.itemId
        });
    };

    const isDroppable = isPickedUpItemVisible && !item;

    return (
        <StyledBagSlot
            {...otherProps}
            onClick={handleClick}
            isDroppable={isDroppable}
            isDisabled={isDisabled}
            isInteractable={isInteractable}
        >
            {item && itemSlot && (
                <BagItem
                    {...item}
                    ownerId={ownerId}
                    equipIndex={equipIndex}
                    slotIndex={slotIndex}
                    isInteractable={isInteractable}
                />
            )}
        </StyledBagSlot>
    );
};

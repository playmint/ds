/** @format */

import { FunctionComponent } from 'react';
import styled from 'styled-components';
import { ComponentProps } from '@app/types/component-props';
import { styles } from './bag-slot.styles';
import { BagItem } from '@app/plugins/inventory/bag-item';
import { useInventory } from '@app/plugins/inventory/inventory-provider';
import { ItemSlotFragment } from '@dawnseekers/core';
import { getItemDetails } from '@app/plugins/inventory/helpers';

export interface BagSlotProps extends ComponentProps {
    itemSlot?: ItemSlotFragment;
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
    const { itemSlot, isDisabled, ownerId, equipIndex, slotIndex, isInteractable, isPending, ...otherProps } = props;
    const { dropStack, dropSingle, isPickedUpItemVisible, pickedUpItem } = useInventory();

    const item = itemSlot?.balance ? getItemDetails(itemSlot) : null;

    const handleLeftClick = () => {
        if (!isPickedUpItemVisible || !isInteractable || !pickedUpItem) {
            return;
        }

        dropStack(
            {
                id: ownerId,
                equipIndex,
                slotIndex
            },
            itemSlot?.balance || 0
        );
    };

    const handleRightClick = () => {
        if (!isPickedUpItemVisible || !isInteractable || !pickedUpItem) {
            return;
        }

        dropSingle(
            {
                id: ownerId,
                equipIndex,
                slotIndex
            },
            itemSlot?.balance || 0
        );
    };

    const isDroppable = isPickedUpItemVisible && !item;

    return (
        <StyledBagSlot
            {...otherProps}
            onClick={handleLeftClick}
            onContextMenu={handleRightClick}
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
                    isPending={isPending}
                />
            )}
        </StyledBagSlot>
    );
};

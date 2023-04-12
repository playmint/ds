/** @format */

import { FunctionComponent } from 'react';
import styled from 'styled-components';
import { ComponentProps } from '@app/types/component-props';
import { styles } from './crafting-bag-slot.styles';
import { BagItem } from '@app/plugins/inventory/bag-item';
import { useInventory } from '@app/plugins/inventory/inventory-provider';
import { ItemSlotFragment } from '@dawnseekers/core';
import { getItemDetails } from '@app/plugins/inventory/helpers';

export interface CraftingBagSlotProps extends ComponentProps {
    itemSlot?: ItemSlotFragment;
    placeholder?: ItemSlotFragment;
    ownerId: string;
    bagId: string;
    equipIndex: number;
    slotKey: number;
    isInteractable?: boolean;
    isPending?: boolean;
}

const StyledBagSlot = styled('div')`
    ${styles}
`;

export const CraftingBagSlot: FunctionComponent<CraftingBagSlotProps> = (props: CraftingBagSlotProps) => {
    const { itemSlot, placeholder, ownerId, bagId, equipIndex, slotKey, isInteractable, isPending, ...otherProps } =
        props;
    const { dropStack, dropSingle, isPickedUpItemVisible, pickedUpItem } = useInventory();

    const item = itemSlot?.balance ? getItemDetails(itemSlot) : null;
    const placeholderItem = placeholder?.balance ? getItemDetails(placeholder) : null;

    const handleLeftClick = () => {
        if (!isPickedUpItemVisible || !isInteractable || !pickedUpItem) {
            return;
        }

        // todo check if we have the correct resources

        dropStack(
            {
                id: ownerId,
                equipIndex,
                slotKey
            },
            itemSlot?.balance || 0,
            bagId
        );
    };

    const handleRightClick = () => {
        if (!isPickedUpItemVisible || !isInteractable || !pickedUpItem) {
            return;
        }

        // todo check if we have the correct resources

        dropSingle(
            {
                id: ownerId,
                equipIndex,
                slotKey
            },
            itemSlot?.balance || 0,
            bagId
        );
    };

    const isDroppable = isPickedUpItemVisible && !item;

    return (
        <StyledBagSlot
            {...otherProps}
            onClick={handleLeftClick}
            onContextMenu={handleRightClick}
            isDroppable={isDroppable}
            isInteractable={isInteractable}
        >
            {item
                ? itemSlot && (
                      <BagItem
                          {...item}
                          ownerId={ownerId}
                          equipIndex={equipIndex}
                          slotKey={slotKey}
                          isInteractable={isInteractable}
                          isPending={isPending}
                      />
                  )
                : placeholderItem && (
                      <div
                          className="placeholder"
                          title={`Requires ${placeholderItem.quantity} ${placeholderItem.name}`}
                      >
                          <img src={placeholderItem.icon} alt={placeholderItem.name} className="icon" />
                          <span className="amount">{placeholderItem.quantity}</span>
                      </div>
                  )}
        </StyledBagSlot>
    );
};

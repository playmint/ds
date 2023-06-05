/** @format */

import { BagItem } from '@app/plugins/inventory/bag-item';
import { getItemDetails } from '@app/plugins/inventory/helpers';
import { useInventory } from '@app/plugins/inventory/inventory-provider';
import { ComponentProps } from '@app/types/component-props';
import { ItemSlotFragment } from '@dawnseekers/core';
import { FunctionComponent } from 'react';
import styled from 'styled-components';
import { styles } from './bag-slot.styles';

export interface BagSlotProps extends ComponentProps {
    itemSlot?: ItemSlotFragment;
    placeholder?: ItemSlotFragment;
    isDisabled?: boolean;
    ownerId: string;
    bagId?: string;
    equipIndex: number;
    slotKey: number;
    isInteractable?: boolean;
    isPending?: boolean;
}

const StyledBagSlot = styled('div')`
    ${styles}
`;

export const BagSlot: FunctionComponent<BagSlotProps> = (props: BagSlotProps) => {
    const {
        itemSlot,
        placeholder,
        isDisabled,
        ownerId,
        bagId,
        equipIndex,
        slotKey,
        isInteractable,
        isPending,
        ...otherProps
    } = props;
    const { drop, isPickedUpItemVisible, pickedUpItem } = useInventory();

    const item = itemSlot?.balance ? getItemDetails(itemSlot) : null;
    const placeholderItem = placeholder?.balance ? getItemDetails(placeholder) : null;

    const handleDrop = (dropQuantity: number) => {
        if (!isPickedUpItemVisible || !isInteractable || !pickedUpItem) {
            return;
        }

        if (placeholder && placeholder.item.id !== pickedUpItem.transferInfo.itemId) {
            return;
        }

        const itemSlotBalance = itemSlot?.balance || 0;

        if (itemSlotBalance > 0 && item && item.itemId != pickedUpItem.transferInfo.itemId) {
            return;
        }
        const transferQuantity = placeholder
            ? Math.min(dropQuantity, Math.max(placeholder.balance - itemSlotBalance, 0))
            : dropQuantity;

        if (transferQuantity === 0) {
            return;
        }

        drop(
            {
                id: ownerId,
                equipIndex,
                slotKey
            },
            itemSlotBalance,
            transferQuantity,
            bagId
        );
    };

    const handleLeftClick = () => {
        if (!pickedUpItem) {
            return;
        }
        const quantity = pickedUpItem.quantity;
        handleDrop(quantity);
    };

    const handleRightClick = () => {
        const quantity = 1;
        handleDrop(quantity);
    };

    // if we have a picked up item in hand and the slot is empty
    // and if there is a placeholder make sure the placeholder matches
    const isDroppable =
        pickedUpItem &&
        !item &&
        ((placeholder && placeholder.item.id === pickedUpItem.transferInfo.itemId) || !placeholder);

    return (
        <StyledBagSlot
            {...otherProps}
            onClick={handleLeftClick}
            onContextMenu={handleRightClick}
            isDroppable={isDroppable}
            isDisabled={isDisabled}
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
                      <div className="placeholder" title={`${placeholderItem.quantity} ${placeholderItem.name}`}>
                          <img src={placeholderItem.icon} alt={placeholderItem.name} className="icon" />
                          <span className="amount">{placeholderItem.quantity}</span>
                      </div>
                  )}
        </StyledBagSlot>
    );
};

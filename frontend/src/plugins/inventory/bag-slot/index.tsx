/** @format */

import { getItemStructure } from '@app/helpers';
import { BagItem } from '@app/plugins/inventory/bag-item';
import { getItemDetails } from '@app/plugins/inventory/helpers';
import { useInventory } from '@app/plugins/inventory/inventory-provider';
import { ComponentProps } from '@app/types/component-props';
import { ItemSlotFragment } from '@downstream/core';
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
    isInteractable?: boolean | ((ownerId: string, slot?: ItemSlotFragment) => boolean);
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
        isInteractable: isInteractableFunc,
        isPending,
        ...otherProps
    } = props;
    const { drop, isPickedUpItemVisible, pickedUpItem } = useInventory();

    const item = itemSlot?.balance ? getItemDetails(itemSlot) : null;
    const placeholderItem = placeholder?.balance ? getItemDetails(placeholder) : null;
    const itemSlotBalance = itemSlot?.balance || 0;
    const isInteractable =
        typeof isInteractableFunc === 'function' ? isInteractableFunc(ownerId, itemSlot) : isInteractableFunc;

    const handleDrop = (dropQuantity: number) => {
        if (!isPickedUpItemVisible || !isInteractable || !pickedUpItem) {
            return;
        }

        if (placeholder && placeholder.item.id !== pickedUpItem.transferInfo.itemId) {
            return;
        }

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
                slotKey,
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

    const [isStackableItem] = item ? getItemStructure(item.itemId) : [false];

    const isCompatiblePlaceholder =
        pickedUpItem && ((placeholder && placeholder.item.id === pickedUpItem.transferInfo.itemId) || !placeholder);
    const isStackableSlot =
        pickedUpItem &&
        item &&
        pickedUpItem.transferInfo.itemId == item.itemId &&
        (isStackableItem ? itemSlotBalance < 100 : itemSlotBalance == 0);

    // if we have a picked up item in hand and the slot is compatible/stackable
    const isDroppable = pickedUpItem && ((!item && isCompatiblePlaceholder) || (item && isStackableSlot));

    // it's possible for a slot to contain an item that doesn't match the slot's
    // recipe/placeholder, try to detect this invalid state
    const isInvalid = !!(itemSlotBalance > 0 && placeholderItem && item && placeholderItem.itemId !== item.itemId);

    return (
        <StyledBagSlot
            {...otherProps}
            onClick={handleLeftClick}
            onContextMenu={handleRightClick}
            isDroppable={isDroppable}
            isDisabled={isDisabled}
            isInteractable={isInteractable}
            isInvalid={isInvalid}
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
                          isInvalid={isInvalid}
                      />
                  )
                : placeholderItem && (
                      <div className="placeholder" title={`${placeholderItem.quantity} ${placeholderItem.name}`}>
                          <div
                              className="icon"
                              style={{
                                  maskImage: `url(${placeholderItem.icon})`,
                                  WebkitMaskImage: `url(${placeholderItem.icon})`,
                                  backgroundColor: 'white',
                              }}
                          ></div>
                          <span className="amount">{placeholderItem.quantity}</span>
                      </div>
                  )}
        </StyledBagSlot>
    );
};

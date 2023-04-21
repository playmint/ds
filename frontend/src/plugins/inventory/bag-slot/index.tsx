/** @format */

import { FunctionComponent } from 'react';
import styled from 'styled-components';
import { ComponentProps } from '@app/types/component-props';
import { styles } from './bag-slot.styles';
import { BagItem } from '@app/plugins/inventory/bag-item';
import { useInventory } from '@app/plugins/inventory/inventory-provider';
import { ItemSlotFragment } from '@dawnseekers/core';
import { getItemDetails, resourceIds, resources } from '@app/plugins/inventory/helpers';

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
    const { dropStack, dropSingle, isPickedUpItemVisible, pickedUpItem } = useInventory();

    const item = itemSlot?.balance ? getItemDetails(itemSlot) : null;
    const placeholderItem = placeholder?.balance ? getItemDetails(placeholder) : null;

    const handleLeftClick = () => {
        if (!isPickedUpItemVisible || !isInteractable || !pickedUpItem) {
            return;
        }

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
                      <div
                          className="placeholder"
                          title={`Requires ${placeholderItem.quantity} ${
                              placeholderItem.name === resources[resourceIds.unknown]
                                  ? 'of any resource'
                                  : placeholderItem.name
                          }`}
                      >
                          <img
                              src={placeholderItem.icon}
                              alt={
                                  placeholderItem.name === resources[resourceIds.unknown]
                                      ? 'Any resource'
                                      : placeholderItem.name
                              }
                              className="icon"
                          />
                          <span className="amount">{placeholderItem.quantity}</span>
                      </div>
                  )}
        </StyledBagSlot>
    );
};

/** @format */

import { BagSlot, BagSlotProps } from '@app/plugins/inventory/bag-slot';
import { useInventory } from '@app/plugins/inventory/inventory-provider';
import { ComponentProps } from '@app/types/component-props';
import { BagFragment } from '@dawnseekers/core';
import { FunctionComponent } from 'react';
import styled from 'styled-components';
import { styles } from './bag.styles';

export interface BagProps extends ComponentProps {
    bag: BagFragment;
    ownerId: string;
    equipIndex: number;
    isInteractable: boolean;
}

const StyledBag = styled('div')`
    ${styles}
`;

export const Bag: FunctionComponent<BagProps> = (props: BagProps) => {
    const { bag, ownerId, equipIndex, isInteractable, ...otherProps } = props;
    const { getPendingTransfers } = useInventory();
    const pending = getPendingTransfers(ownerId, equipIndex);

    const numBagSlots = 4;

    const slots: BagSlotProps[] = Array(numBagSlots)
        .fill(null)
        .map(() => ({
            ownerId,
            equipIndex,
            slotIndex: bag.slots.length,
            isDisabled: true,
            isInteractable,
            isPending: false
        }))
        .map((slot: BagSlotProps, index) => {
            // we want to check if the bag has a slot for this index
            // if so then we update some props to match the slot
            if (bag.slots.length > index) {
                slot.itemSlot = bag.slots[index];
                slot.slotIndex = index;
                slot.isDisabled = false;
            }

            // we want to check if the slot has a pending from if so we update the balance
            const from = pending.map(([from, _]) => from).find((from) => from.slotIndex === index);
            if (from) {
                if (slot.itemSlot) {
                    slot.itemSlot.balance = from.newBalance;
                } else {
                    slot.itemSlot = {
                        key: index,
                        balance: from.newBalance,
                        item: {
                            id: from.itemId
                        }
                    };
                }
                slot.isPending = true;
                slot.isDisabled = false;
            }

            // we want to check if the slot has a pending to if so we
            // update the balance and add the item id
            const to = pending.map(([_, to]) => to).find((to) => to.slotIndex === index);
            if (to) {
                if (slot.itemSlot) {
                    slot.itemSlot.balance = to.newBalance;
                } else {
                    slot.itemSlot = {
                        key: index,
                        balance: to.newBalance,
                        item: {
                            id: to.itemId
                        }
                    };
                }
                slot.isPending = true;
                slot.isDisabled = false;
            }

            return slot;
        });

    // finally we find the first disabled slot to convert it to an empty slot
    const emptySlot = slots.find((s) => s.isDisabled);
    if (emptySlot) {
        emptySlot.isDisabled = false;
    }

    return (
        <StyledBag {...otherProps}>
            <img src="/icons/bag.png" alt="" className="icon" />
            <ul className="slots">
                {slots.map((slot: BagSlotProps, index: number) => (
                    <BagSlot key={index} as="li" {...slot} />
                ))}
            </ul>
        </StyledBag>
    );
};

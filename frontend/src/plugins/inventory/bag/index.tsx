/** @format */

import { BagSlot, BagSlotProps } from '@app/plugins/inventory/bag-slot';
import { useInventory } from '@app/plugins/inventory/inventory-provider';
import { ComponentProps } from '@app/types/component-props';
import { BagFragment } from '@dawnseekers/core';
import { FunctionComponent, useEffect, useRef } from 'react';
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
    const { getPendingFromTransfers, getPendingToTransfers, addBagRef, removeBagRef } = useInventory();
    const pendingFrom = getPendingFromTransfers(ownerId, equipIndex);
    const pendingTo = getPendingToTransfers(ownerId, equipIndex);
    const slotsRef = useRef<HTMLUListElement>(null);

    const numBagSlots = 4;

    const slots: BagSlotProps[] = Array(numBagSlots)
        .fill(null)
        .map((_, slotIndex) => ({
            ownerId,
            equipIndex,
            slotIndex,
            isDisabled: true,
            isInteractable,
            isPending: false
        }))
        .map((slot: BagSlotProps, index) => {
            // we want to check if the bag has a slot for this index
            // if so then we update some props to match the slot
            const itemSlot = bag.slots.find((itemSlot) => itemSlot.key === index);
            if (itemSlot) {
                slot.itemSlot = itemSlot;
                slot.isDisabled = false;
            }

            // we want to check if the slot has a pending from if so we update the balance
            const from = pendingFrom.map(([from, _]) => from).find((from) => from.slotIndex === index);
            if (from) {
                slot.isPending = false;
                slot.isDisabled = false;
                slot.isInteractable = false;
            }

            // we want to check if the slot has a pending to if so we
            // update the balance and add the item id
            const to = pendingTo.map(([_, to]) => to).find((to) => to.slotIndex === index);
            if (to) {
                if (slot.itemSlot) {
                    slot.itemSlot.balance = to.newBalance;
                } else {
                    slot.itemSlot = {
                        key: index,
                        balance: to.newBalance,
                        item: {
                            id: to.itemId,
                            kind: to.itemKind
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

    useEffect(() => {
        addBagRef(slotsRef);
        return () => removeBagRef(slotsRef);
    });

    return (
        <StyledBag {...otherProps}>
            <img src="/icons/bag.png" alt="" className="icon" />
            <ul className="slots" ref={slotsRef}>
                {slots.map((slot: BagSlotProps, index: number) => (
                    <BagSlot key={index} as="li" {...slot} />
                ))}
            </ul>
        </StyledBag>
    );
};

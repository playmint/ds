/** @format */

import { BagSlot, BagSlotProps } from '@app/plugins/inventory/bag-slot';
import { useInventory } from '@app/plugins/inventory/inventory-provider';
import { ComponentProps } from '@app/types/component-props';
import { BagFragment } from '@dawnseekers/core';
import { FunctionComponent, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { styles } from './bag.styles';
import { getNewSlotKey } from '@app/plugins/inventory/helpers';

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

    // we need 4 slot keys so we are going to use any existing ones
    // and then generate the remainder
    const slotKeys = bag.slots.map((s) => s.key);
    for (let n = 0; n < numBagSlots - bag.slots.length; n += 1) {
        slotKeys.push(getNewSlotKey(bag, n));
    }

    const slots: BagSlotProps[] = slotKeys
        .map((slotKey) => ({
            ownerId,
            equipIndex,
            slotKey,
            isDisabled: false,
            isInteractable,
            isPending: false
        }))
        .map((slot: BagSlotProps) => {
            // we want to check if the bag has a slot for this index
            // if so then we update some props to match the slot
            const itemSlot = bag.slots.find((itemSlot) => itemSlot.key === slot.slotKey);
            if (itemSlot) {
                slot.itemSlot = itemSlot;
            }

            // we want to check if the slot has a pending from if so we update the balance
            const from = pendingFrom.map(([from, _]) => from).find((from) => from.slotKey === slot.slotKey);
            if (from) {
                slot.isPending = false;
                slot.isInteractable = false;
            }

            // we want to check if the slot has a pending to if so we
            // update the balance and add the item id
            const to = pendingTo.map(([_, to]) => to).find((to) => to.slotKey === slot.slotKey);
            if (to) {
                if (slot.itemSlot) {
                    slot.itemSlot.balance = to.newBalance;
                } else {
                    slot.itemSlot = {
                        key: slot.slotKey,
                        balance: to.newBalance,
                        item: {
                            id: to.itemId,
                            kind: to.itemKind
                        }
                    };
                }
                slot.isPending = true;
            }

            return slot;
        });

    useEffect(() => {
        addBagRef(slotsRef);
        return () => removeBagRef(slotsRef);
    }, [addBagRef, removeBagRef]);

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

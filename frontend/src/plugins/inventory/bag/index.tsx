/** @format */

import { BagSlot, BagSlotProps } from '@app/plugins/inventory/bag-slot';
import { useInventory } from '@app/plugins/inventory/inventory-provider';
import { ComponentProps } from '@app/types/component-props';
import { BagFragment, ItemSlotFragment } from '@dawnseekers/core';
import { FunctionComponent, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { styles } from './bag.styles';

export interface BagProps extends ComponentProps {
    bag: BagFragment;
    bagId?: string;
    ownerId: string;
    equipIndex: number;
    isInteractable: boolean;
    recipe?: ItemSlotFragment[];
    numBagSlots?: number;
    showIcon?: boolean;
}

const StyledBag = styled('div')`
    ${styles}
`;

export const Bag: FunctionComponent<BagProps> = (props: BagProps) => {
    const {
        bag,
        bagId,
        ownerId,
        equipIndex,
        isInteractable,
        recipe,
        numBagSlots = 4,
        showIcon = true,
        ...otherProps
    } = props;
    const { addBagRef, removeBagRef } = useInventory();
    // const pendingFrom = getPendingFromTransfers(ownerId, equipIndex);
    // const pendingTo = getPendingToTransfers(ownerId, equipIndex);
    const slotsRef = useRef<HTMLUListElement>(null);
    const slotKeys = recipe ? recipe.map((r) => r.key) : Array.from(Array(numBagSlots).keys());
    const slots: BagSlotProps[] = slotKeys
        .map((slotKey, index) => ({
            ownerId,
            equipIndex,
            slotKey,
            isDisabled: false,
            isInteractable,
            isPending: false,
            bagId,
            placeholder: recipe && recipe[index]
        }))
        .map((slot: BagSlotProps) => {
            // we want to check if the bag has a slot for this index
            // if so then we update some props to match the slot
            const itemSlot = bag.slots.find((itemSlot) => itemSlot.key === slot.slotKey);
            if (itemSlot) {
                slot.itemSlot = itemSlot;
            }

            // we want to check if the slot has a pending from if so we update the balance
            // const from = pendingFrom.map(([from, _]) => from).find((from) => from.slotKey === slot.slotKey);
            // if (from) {
            //     slot.isPending = false;
            //     slot.isInteractable = false;
            // }

            // we want to check if the slot has a pending to if so we
            // update the balance and add the item id
            // const to = pendingTo.map(([_, to]) => to).find((to) => to.slotKey === slot.slotKey);
            // if (to) {
            //     if (slot.itemSlot) {
            //         slot.itemSlot.balance = to.newBalance;
            //         slot.itemSlot.item.id = to.itemId;
            //     } else {
            //         slot.itemSlot = {
            //             key: slot.slotKey,
            //             balance: to.newBalance,
            //             item: {
            //                 id: to.itemId
            //             }
            //         };
            //     }
            //     slot.isPending = true;
            // }

            return slot;
        });

    useEffect(() => {
        addBagRef(slotsRef);
        return () => removeBagRef(slotsRef);
    }, [addBagRef, removeBagRef]);

    return (
        <StyledBag {...otherProps}>
            {showIcon && <img src="/icons/bag.png" alt="" className="icon" />}
            <ul className="slots" ref={slotsRef}>
                {slots.map((slot: BagSlotProps) => (
                    <BagSlot key={slot.slotKey} as="li" {...slot} />
                ))}
            </ul>
        </StyledBag>
    );
};

/** @format */

import { BagSlot, BagSlotProps } from '@app/plugins/inventory/bag-slot';
import { useInventory } from '@app/plugins/inventory/inventory-provider';
import { ComponentProps } from '@app/types/component-props';
import { BagFragment, ItemSlotFragment } from '@downstream/core';
import { FunctionComponent, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { styles } from './bag.styles';

export interface BagProps extends ComponentProps {
    bag: BagFragment;
    bagId?: string;
    ownerId: string;
    equipIndex: number;
    isInteractable?: boolean | ((ownerId: string, slot?: ItemSlotFragment) => boolean);
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
            placeholder: recipe && recipe[index],
        }))
        .map((slot: BagSlotProps) => {
            // we want to check if the bag has a slot for this index
            // if so then we update some props to match the slot
            const itemSlot = bag.slots.find((itemSlot) => itemSlot.key === slot.slotKey);
            if (itemSlot) {
                slot.itemSlot = itemSlot;
            }

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

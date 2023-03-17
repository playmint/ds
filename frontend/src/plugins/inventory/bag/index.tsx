/** @format */

import React, { FunctionComponent } from 'react';
import styled from 'styled-components';
import { ComponentProps } from '@app/types/component-props';
import { styles } from './bag.styles';
import { BagSlot } from '@app/plugins/inventory/bag-slot';
import { Iterate } from '@app/helpers/iterate';
import { Bag as BagNode, ItemSlot } from '@core';

export interface BagProps extends ComponentProps {
    bag: BagNode;
    ownerId: string;
    equipIndex: number;
    isInteractable: boolean;
}

const StyledBag = styled('div')`
    ${styles}
`;

export const Bag: FunctionComponent<BagProps> = (props: BagProps) => {
    const { bag, ownerId, equipIndex, isInteractable, ...otherProps } = props;
    const numBagSlots = 4;
    const emptySlots = numBagSlots - bag.slots.length - 1;

    return (
        <StyledBag {...otherProps}>
            <img src="/icons/bag.png" alt="" className="icon" />
            <ul className="slots">
                {bag.slots.map((slot: ItemSlot) => (
                    <BagSlot
                        key={slot.key}
                        as="li"
                        itemSlot={slot}
                        ownerId={ownerId}
                        equipIndex={equipIndex}
                        slotIndex={slot.key}
                        isInteractable={isInteractable}
                    />
                ))}
                {bag.slots.length < numBagSlots && (
                    <BagSlot
                        as="li"
                        ownerId={ownerId}
                        equipIndex={equipIndex}
                        slotIndex={bag.slots.length}
                        isInteractable={isInteractable}
                    />
                )}
                <Iterate
                    component={
                        <BagSlot
                            as="li"
                            isDisabled={true}
                            ownerId={ownerId}
                            equipIndex={equipIndex}
                            slotIndex={bag.slots.length}
                            isInteractable={isInteractable}
                        />
                    }
                    number={emptySlots}
                />
            </ul>
        </StyledBag>
    );
};

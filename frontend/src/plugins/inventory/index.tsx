/** @format */

import { FunctionComponent } from 'react';
import styled from 'styled-components';
import { ComponentProps } from '@app/types/component-props';
import { Bag } from '@app/plugins/inventory/bag';
import { EquipmentSlotFragment } from '@downstream/core';

export interface InventoryProps extends ComponentProps {
    ownerId: string;
    bags: EquipmentSlotFragment[];
    isInteractable: boolean;
    showIcon?: boolean;
}

const StyledInventory = styled('div')`
    > .bags {
        > li:not(:last-child) {
            margin-bottom: 1.6rem;
        }
    }
`;

export const Inventory: FunctionComponent<InventoryProps> = (props: InventoryProps) => {
    const { bags, ownerId, isInteractable, showIcon, ...otherProps } = props;

    return (
        <StyledInventory {...otherProps}>
            <ul className="bags">
                {bags.map((equipSlot) => (
                    <Bag
                        key={equipSlot.key}
                        bag={equipSlot.bag}
                        equipIndex={equipSlot.key}
                        ownerId={ownerId}
                        isInteractable={isInteractable}
                        showIcon={showIcon}
                        as="li"
                    />
                ))}
            </ul>
        </StyledInventory>
    );
};

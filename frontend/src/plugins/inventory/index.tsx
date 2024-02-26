/** @format */

import { Bag } from '@app/plugins/inventory/bag';
import { ComponentProps } from '@app/types/component-props';
import { BagFragment } from '@downstream/core';
import { FunctionComponent } from 'react';
import styled from 'styled-components';

export interface InventoryProps extends ComponentProps {
    ownerId: string;
    bags: BagFragment[];
    isInteractable: boolean;
    showIcon?: boolean;
    numBagSlots?: number;
}

const StyledInventory = styled('div')`
    > .bags {
        > li:not(:last-child) {
            margin-bottom: 1.6rem;
        }
    }
`;

export const Inventory: FunctionComponent<InventoryProps> = (props: InventoryProps) => {
    const { bags, ownerId, isInteractable, showIcon, numBagSlots } = props;

    return (
        <StyledInventory>
            <ul className="bags">
                {bags.map((bag) => (
                    <Bag
                        key={bag.equipee?.key || 0}
                        bag={bag}
                        equipIndex={bag.equipee?.key || 0}
                        ownerId={ownerId}
                        isInteractable={isInteractable}
                        showIcon={showIcon}
                        numBagSlots={numBagSlots}
                    />
                ))}
            </ul>
        </StyledInventory>
    );
};

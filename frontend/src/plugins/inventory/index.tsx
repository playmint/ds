/** @format */

import { FunctionComponent } from 'react';
import styled from 'styled-components';
import { ComponentProps } from '@app/types/component-props';
import { Bag } from '@app/plugins/inventory/bag';
import { BagFragment } from '@downstream/core';

export interface InventoryProps extends ComponentProps {
    ownerId: string;
    bags: BagFragment[];
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
    const { bags, ownerId, isInteractable, showIcon } = props;

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
                    />
                ))}
            </ul>
        </StyledInventory>
    );
};

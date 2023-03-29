/** @format */

import { FunctionComponent } from 'react';
import styled from 'styled-components';
import { ComponentProps } from '@app/types/component-props';
import { styles } from './bag-item.styles';
import { useInventory } from '@app/plugins/inventory/inventory-provider';

export interface BagItemProps extends ComponentProps {
    name: string;
    icon: string;
    quantity: number;
    ownerId: string;
    equipIndex: number;
    slotIndex: number;
    itemId: string;
    itemKind: string;
    isInteractable: boolean;
    isPending: boolean;
}

const StyledBagItem = styled('div')`
    ${styles}
`;

export const BagItem: FunctionComponent<BagItemProps> = (props: BagItemProps) => {
    const {
        name,
        icon,
        quantity,
        ownerId,
        equipIndex,
        slotIndex,
        itemId,
        itemKind,
        isPending,
        isInteractable,
        ...otherProps
    } = props;
    const { pickUpItem, isPickedUpItemVisible } = useInventory();

    const handleClick = () => {
        if (!isInteractable || isPickedUpItemVisible) {
            return;
        }
        const transferInfo = {
            id: ownerId,
            equipIndex,
            slotIndex,
            newBalance: 0,
            itemId,
            itemKind
        };
        const item = { name, icon, quantity, transferInfo };
        pickUpItem(item);
    };

    const isPickable = !isPickedUpItemVisible;

    return (
        <StyledBagItem {...otherProps} onClick={handleClick} isPickable={isPickable} isInteractable={isInteractable}>
            {isPending && <span className="spinner" />}
            <img src={icon} alt={name} className="icon" />
            <span className="amount">{quantity}</span>
        </StyledBagItem>
    );
};

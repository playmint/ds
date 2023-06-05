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
    slotKey: number;
    itemId: string;
    isInteractable?: boolean;
    isPending?: boolean;
    isInvalid?: boolean;
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
        slotKey,
        itemId,
        isPending,
        isInteractable,
        isInvalid,
        ...otherProps
    } = props;
    const { pickUpItem, isPickedUpItemVisible } = useInventory();

    const handleClick = () => {
        if (!isInteractable || isPickedUpItemVisible || isPending) {
            return;
        }
        const transferInfo = {
            id: ownerId,
            equipIndex,
            slotKey,
            newBalance: 0,
            itemId
        };
        const item = { name, icon, quantity, transferInfo };
        pickUpItem(item);
    };

    const isPickable = !isPickedUpItemVisible;

    const [_stackable, life, defense, attack] = [...itemId]
        .slice(2)
        .reduce((bs, b, idx) => {
            if (idx % 8 === 0) {
                bs.push('0x');
            }
            bs[bs.length - 1] += b;
            return bs;
        }, [] as string[])
        .map((n: string) => BigInt(n))
        .slice(-4);
    const tooltip = isInvalid
        ? `Slot contains invalid ${name} item\n\nRemove item from slot to continue`
        : `${quantity} ${name}\n\nLife: ${life}\nDefense: ${defense}\nAttack: ${attack}`;

    return (
        <StyledBagItem
            {...otherProps}
            onClick={handleClick}
            isPickable={isPickable}
            isInteractable={isInteractable}
            title={tooltip}
        >
            {isPending && <span className="spinner" />}
            <img src={icon} alt={name} className="icon" />
            <span className="amount">{quantity}</span>
        </StyledBagItem>
    );
};

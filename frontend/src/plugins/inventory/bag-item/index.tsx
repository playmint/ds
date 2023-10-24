import { FunctionComponent } from 'react';
import styled from 'styled-components';
import { ComponentProps } from '@app/types/component-props';
import { styles } from './bag-item.styles';
import { useInventory } from '@app/plugins/inventory/inventory-provider';
import { getItemColorCSS, getItemStructure } from '@app/helpers';

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

const StyledBagItem = styled.div`
    ${styles}
`;

export const BagItem: FunctionComponent<BagItemProps> = (props: BagItemProps) => {
    const { name, icon, quantity, ownerId, equipIndex, slotKey, itemId, isPending, isInteractable, isInvalid } = props;
    const { pickUpItem, isPickedUpItemVisible } = useInventory();
    const numPaddingZeros = Math.max(3 - quantity.toString().length, 0);

    const handleClick = () => {
        if (!isInteractable || isPickedUpItemVisible || isPending) {
            return;
        }
        const transferInfo = {
            id: ownerId,
            equipIndex,
            slotKey,
            newBalance: 0,
            itemId,
        };
        const item = { name, icon, quantity, transferInfo };
        pickUpItem(item);
    };

    const isPickable = !isPickedUpItemVisible;

    const [stackable, greenGoo, blueGoo, redGoo] = getItemStructure(itemId);

    const isStackable = !!stackable;

    const tooltip = isInvalid
        ? `Slot contains invalid ${name} item\n\nRemove item from slot to continue`
        : `${quantity} ${name}\n\nGreen Goo: ${greenGoo}\nBlue Goo: ${blueGoo}\nRed Goo: ${redGoo}`;

    return (
        <StyledBagItem onClick={handleClick} isPickable={isPickable} isInteractable={isInteractable} title={tooltip}>
            {isPending && <span className="spinner" />}
            <div
                className="icon"
                style={{
                    maskImage: `url(${icon})`,
                    WebkitMaskImage: `url(${icon})`,
                    backgroundColor: getItemColorCSS(itemId),
                }}
            ></div>
            {isStackable && (
                <span className="amount">
                    <span className="padding">{new Array(numPaddingZeros).fill(0).join('')}</span>
                    {quantity}
                </span>
            )}
        </StyledBagItem>
    );
};

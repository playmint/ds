/** @format */

import otherUnitIcon from '@app/../public/icons/mobile-unit-theirs.svg';
import playerUnitIcon from '@app/../public/icons/mobile-unit-yours.svg';
import { formatNameOrId } from '@app/helpers';
import { ComponentProps } from '@app/types/component-props';
import { BagFragment, ConnectedPlayer, ItemSlotFragment, MobileUnit, WorldTileFragment } from '@downstream/core';
import Image from 'next/image';
import { FunctionComponent, useCallback } from 'react';
import styled from 'styled-components';
import { Inventory } from '../inventory';
import { useInventory } from '../inventory/inventory-provider';
import { styles } from './mobile-unit-list.styles';
import { getBagsAtEquipee } from '@downstream/core/src/utils';

const MobileUnitListItem = ({ unit, unitBags, icon, isInteractable }) => {
    return (
        <div className="mobileUnitListItem">
            <div className="mobileUnit">
                <Image src={icon} alt="" width={65} />
                {formatNameOrId(unit, 'Unit ')}
            </div>
            <Inventory showIcon={false} bags={unitBags} ownerId={unit.id} isInteractable={isInteractable} />
        </div>
    );
};

export interface MobileUnitListProps extends ComponentProps {
    player?: ConnectedPlayer;
    mobileUnits: MobileUnit[];
    tile?: WorldTileFragment;
    bags: BagFragment[];
}

const StyledMobileUnitList = styled.div`
    ${styles}
`;

export const MobileUnitList: FunctionComponent<MobileUnitListProps> = (props: MobileUnitListProps) => {
    const { mobileUnits, player, tile, bags } = props;
    const { isMobileUnitAtLocation } = useInventory();

    const isInteractable = useCallback(
        (ownerId: string, slot?: ItemSlotFragment) => {
            if (ownerId === player?.id) {
                return true;
            }
            if (!tile) {
                return false;
            }
            if (!isMobileUnitAtLocation(tile)) {
                return false;
            }
            return !slot || slot.balance === 0;
        },
        [player, tile, isMobileUnitAtLocation]
    );

    return (
        <StyledMobileUnitList>
            {mobileUnits.map((unit) => (
                <MobileUnitListItem
                    key={unit.id}
                    icon={player && unit.owner?.id == player.id ? playerUnitIcon : otherUnitIcon}
                    unit={unit}
                    unitBags={getBagsAtEquipee(bags, unit)}
                    isInteractable={isInteractable}
                />
            ))}
        </StyledMobileUnitList>
    );
};

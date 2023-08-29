/** @format */

import otherUnitIcon from '@app/../public/mobile-unit-theirs.png';
import playerUnitIcon from '@app/../public/mobile-unit-yours.png';
import { formatNameOrId } from '@app/helpers';
import { ComponentProps } from '@app/types/component-props';
import { ConnectedPlayer, ItemSlotFragment, MobileUnit, SelectedTileFragment } from '@downstream/core';
import Image from 'next/image';
import { FunctionComponent, useCallback } from 'react';
import styled from 'styled-components';
import { Inventory } from '../inventory';
import { useInventory } from '../inventory/inventory-provider';
import { styles } from './mobile-unit-list.styles';

const MobileUnitListItem = ({ unit, icon, isInteractable }) => {
    return (
        <div className="mobileUnitListItem">
            <div className="mobileUnit">
                <Image src={icon} alt="" width={65} />
                {formatNameOrId(unit, 'Unit ')}
            </div>
            <Inventory showIcon={false} bags={unit.bags} ownerId={unit.id} isInteractable={isInteractable} />
        </div>
    );
};

export interface MobileUnitListProps extends ComponentProps {
    player?: ConnectedPlayer;
    mobileUnits: MobileUnit[];
    tile?: SelectedTileFragment;
}

const StyledMobileUnitList = styled('div')`
    ${styles}
`;

export const MobileUnitList: FunctionComponent<MobileUnitListProps> = (props: MobileUnitListProps) => {
    const { mobileUnits, player, tile, ...otherProps } = props;
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
        <StyledMobileUnitList {...otherProps}>
            {mobileUnits.map((unit) => (
                <MobileUnitListItem
                    key={unit.id}
                    icon={player && unit.owner?.id == player.id ? playerUnitIcon : otherUnitIcon}
                    unit={unit}
                    isInteractable={isInteractable}
                />
            ))}
        </StyledMobileUnitList>
    );
};

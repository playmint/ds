/** @format */

import { Inventory } from '@app/plugins/inventory/index';
import { ComponentProps } from '@app/types/component-props';
import { BagFragment, WorldMobileUnitFragment } from '@downstream/core';
import { FunctionComponent } from 'react';
import styled from 'styled-components';

export interface MobileUnitInventoryProps extends ComponentProps {
    mobileUnit: WorldMobileUnitFragment;
    bags: BagFragment[];
}

const StyledMobileUnitInventory = styled.div``;

export const MobileUnitInventory: FunctionComponent<MobileUnitInventoryProps> = (props: MobileUnitInventoryProps) => {
    const { mobileUnit, bags } = props;

    return (
        <StyledMobileUnitInventory>
            {bags.length > 0 ? (
                <Inventory
                    bags={bags.sort((a, b) => {
                        if (!a.equipee || !b.equipee) return 0;
                        return a.equipee.key - b.equipee.key;
                    })}
                    ownerId={mobileUnit.id}
                    isInteractable={true}
                />
            ) : (
                <span>The selected unit has no bags</span>
            )}
        </StyledMobileUnitInventory>
    );
};

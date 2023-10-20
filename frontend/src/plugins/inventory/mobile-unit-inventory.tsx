/** @format */

import { Inventory } from '@app/plugins/inventory/index';
import { ComponentProps } from '@app/types/component-props';
import { BagFragment, WorldMobileUnitFragment } from '@downstream/core';
import { getBagsAtEquipee } from '@downstream/core/src/utils';
import { FunctionComponent } from 'react';
import styled from 'styled-components';
import { BasePanelStyles } from '@app/styles/base-panel.styles';

export interface MobileUnitInventoryProps extends ComponentProps {
    mobileUnit: WorldMobileUnitFragment;
    bags: BagFragment[];
}

const StyledMobileUnitInventory = styled.div`
    ${BasePanelStyles}
    margin-bottom: 1.2rem;
    width: 30rem;
`;

export const MobileUnitInventory: FunctionComponent<MobileUnitInventoryProps> = (props: MobileUnitInventoryProps) => {
    const { mobileUnit, bags } = props;
    const mobileUnitBags = mobileUnit ? getBagsAtEquipee(bags, mobileUnit) : [];

    return (
        <StyledMobileUnitInventory>
            {mobileUnitBags.length > 0 ? (
                <Inventory bags={mobileUnitBags} ownerId={mobileUnit.id} isInteractable={true} />
            ) : (
                <span>The selected unit has no bags</span>
            )}
        </StyledMobileUnitInventory>
    );
};

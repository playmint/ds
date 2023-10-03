/** @format */

import React, { FunctionComponent } from 'react';
import styled from 'styled-components';
import { ComponentProps } from '@app/types/component-props';
import { SelectedMobileUnitFragment } from '@downstream/core';
import { Inventory } from '@app/plugins/inventory/index';

export interface MobileUnitInventoryProps extends ComponentProps {
    mobileUnit: SelectedMobileUnitFragment;
}

const StyledMobileUnitInventory = styled.div`
    background: #143063;
    color: #fff;
    padding: 2rem 2rem;
    margin-bottom: 1.2rem;
    width: 30rem;
`;

export const MobileUnitInventory: FunctionComponent<MobileUnitInventoryProps> = (props: MobileUnitInventoryProps) => {
    const { mobileUnit } = props;

    return (
        <StyledMobileUnitInventory>
            {mobileUnit.bags.length > 0 ? (
                <Inventory bags={mobileUnit.bags} ownerId={mobileUnit.id} isInteractable={true} />
            ) : (
                <span>The selected unit has no bags</span>
            )}
        </StyledMobileUnitInventory>
    );
};

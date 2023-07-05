/** @format */

import React, { FunctionComponent } from 'react';
import styled from 'styled-components';
import { ComponentProps } from '@app/types/component-props';
import { SelectedMobileUnitFragment } from '@downstream/core';
import { Inventory } from '@app/plugins/inventory/index';

export interface MobileUnitInventoryProps extends ComponentProps {
    mobileUnit: SelectedMobileUnitFragment;
}

const StyledMobileUnitInventory = styled('div')``;

export const MobileUnitInventory: FunctionComponent<MobileUnitInventoryProps> = (props: MobileUnitInventoryProps) => {
    const { mobileUnit, ...otherProps } = props;

    return (
        <StyledMobileUnitInventory {...otherProps}>
            {mobileUnit.bags.length > 0 ? (
                <Inventory bags={mobileUnit.bags} ownerId={mobileUnit.id} isInteractable={true} />
            ) : (
                <span>The selected unit has no bags</span>
            )}
        </StyledMobileUnitInventory>
    );
};

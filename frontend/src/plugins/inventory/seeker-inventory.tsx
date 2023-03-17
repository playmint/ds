/** @format */

import React, { FunctionComponent } from 'react';
import styled from 'styled-components';
import { ComponentProps } from '@app/types/component-props';
import { Seeker } from '@core';
import { Inventory } from '@app/plugins/inventory/index';

export interface SeekerInventoryProps extends ComponentProps {
    seeker: Seeker;
}

const StyledSeekerInventory = styled('div')``;

export const SeekerInventory: FunctionComponent<SeekerInventoryProps> = (props: SeekerInventoryProps) => {
    const { seeker, ...otherProps } = props;

    return (
        <StyledSeekerInventory {...otherProps}>
            {seeker.bags.length > 0 ? (
                <Inventory bags={seeker.bags} ownerId={seeker.id} isInteractable={true} />
            ) : (
                <span>The selected seeker has no bags</span>
            )}
        </StyledSeekerInventory>
    );
};

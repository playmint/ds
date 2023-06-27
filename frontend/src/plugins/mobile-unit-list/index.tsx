/** @format */

import { formatNameOrId } from '@app/helpers';
import { ComponentProps } from '@app/types/component-props';
import { ConnectedPlayer, MobileUnit } from '@dawnseekers/core';
import { FunctionComponent } from 'react';
import styled from 'styled-components';
import { styles } from './mobile-unit-list.styles';

export interface MobileUnitListProps extends ComponentProps {
    player?: ConnectedPlayer;
    mobileUnits: MobileUnit[];
}

const StyledMobileUnitList = styled('div')`
    ${styles}
`;

export const MobileUnitList: FunctionComponent<MobileUnitListProps> = (props: MobileUnitListProps) => {
    const { mobileUnits, player, ...otherProps } = props;

    return (
        <StyledMobileUnitList {...otherProps}>
            {mobileUnits.map((mobileUnit, index) => (
                <div key={index} className="mobileUnit">
                    {player && mobileUnit?.owner?.id == player.id ? (
                        <img src="/mobile-unit-yours.png" alt="" />
                    ) : (
                        <img src="/mobile-unit-theirs.png" alt="" />
                    )}
                    {formatNameOrId(mobileUnit, 'Unit ')}
                </div>
            ))}
        </StyledMobileUnitList>
    );
};

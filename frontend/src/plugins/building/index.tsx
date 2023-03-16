/** @format */

import { FunctionComponent } from 'react';
import styled from 'styled-components';
import { ComponentProps } from '@app/types/component-props';
import { styles } from './building.styles';

export interface BuildingProps extends ComponentProps {}

const StyledBuilding = styled('div')`
    ${styles}
`;

export const Building: FunctionComponent<BuildingProps> = (props: BuildingProps) => {
    const { ...otherProps } = props;

    return (
        <StyledBuilding {...otherProps}>
            <h3>Sword forge</h3>
            <span className="sub-title">Finely honed steel</span>
            <img src="/building-with-flag.png" alt="" className="building-image" />
            <button className="action-button">Enter</button>
        </StyledBuilding>
    );
};

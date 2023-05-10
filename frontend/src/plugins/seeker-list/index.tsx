/** @format */

import { FunctionComponent } from 'react';
import styled from 'styled-components';
import { ComponentProps } from '@app/types/component-props';
import { styles } from './seeker-list.styles';
import { Seeker } from '@dawnseekers/core';

export interface SeekerListProps extends ComponentProps {
    seekers: Seeker[];
}

const StyledSeekerList = styled('div')`
    ${styles}
`;

export const SeekerList: FunctionComponent<SeekerListProps> = (props: SeekerListProps) => {
    const { seekers, ...otherProps } = props;

    return (
        <StyledSeekerList {...otherProps}>
            <h3>Seekers</h3>
            {seekers.map((seeker, index) => (
                <div key={index} className="seeker">
                    <img src="/seeker-theirs.png" alt="" />
                    Seeker #{seeker.id.slice(-12)}
                </div>
            ))}
        </StyledSeekerList>
    );
};

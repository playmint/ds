/** @format */

import { FunctionComponent } from 'react';
import styled from 'styled-components';
import { ComponentProps } from '@app/types/component-props';
import { styles } from './seeker-list.styles';
import { Seeker } from '@dawnseekers/core';
import { formatUnitKey } from '@app/helpers';

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
            {seekers.map((seeker, index) => (
                <div key={index} className="seeker">
                    <img src="/seeker-theirs.png" alt="" />
                    {seeker && seeker.name?.value
                        ? seeker.name.value
                        : `Unit ${formatUnitKey(seeker?.key.toString() || '')}`}
                </div>
            ))}
        </StyledSeekerList>
    );
};

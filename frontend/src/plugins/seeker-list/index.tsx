/** @format */

import { FunctionComponent } from 'react';
import styled from 'styled-components';
import { ComponentProps } from '@app/types/component-props';
import { styles } from './seeker-list.styles';
import { ConnectedPlayer, Seeker } from '@dawnseekers/core';
import { formatUnitKey } from '@app/helpers';

export interface SeekerListProps extends ComponentProps {
    player?: ConnectedPlayer;
    seekers: Seeker[];
}

const StyledSeekerList = styled('div')`
    ${styles}
`;

export const SeekerList: FunctionComponent<SeekerListProps> = (props: SeekerListProps) => {
    const { seekers, player, ...otherProps } = props;

    return (
        <StyledSeekerList {...otherProps}>
            {seekers.map((seeker, index) => (
                <div key={index} className="seeker">
                    {player && seeker?.owner?.id == player.id ? (
                        <img src="/seeker-yours.png" alt="" />
                    ) : (
                        <img src="/seeker-theirs.png" alt="" />
                    )}
                    {seeker && seeker.name?.value
                        ? seeker.name.value
                        : `Unit ${formatUnitKey(seeker?.key.toString() || '')}`}
                </div>
            ))}
        </StyledSeekerList>
    );
};

/** @format */

import { formatNameOrId } from '@app/helpers';
import { ComponentProps } from '@app/types/component-props';
import { ConnectedPlayer, Seeker } from '@dawnseekers/core';
import { FunctionComponent } from 'react';
import styled from 'styled-components';
import { styles } from './seeker-list.styles';

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
                    {formatNameOrId(seeker, 'Unit ')}
                </div>
            ))}
        </StyledSeekerList>
    );
};

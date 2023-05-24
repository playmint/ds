/** @format */

import { FunctionComponent } from 'react';
import styled from 'styled-components';
import { ComponentProps } from '@app/types/component-props';
import { styles } from './combat-participant.styles';
import { ProgressBar } from '@app/plugins/combat/progress-bar';

export interface CombatParticipantProps extends ComponentProps {
    name: string;
    icon: string;
    maxHealth: number;
    currentHealth: number;
    attack: number;
    defence: number;
    isDead: boolean;
    isPresent: boolean;
}

const StyledCombatParticipant = styled('div')`
    ${styles}
`;

export const CombatParticipant: FunctionComponent<CombatParticipantProps> = (props: CombatParticipantProps) => {
    const { name, icon, maxHealth, currentHealth, attack, defence, ...otherProps } = props;

    return (
        <StyledCombatParticipant {...otherProps}>
            <div className="icon">
                <img src={icon} alt="" />
            </div>
            <div className="name">{name}</div>
            <div className="health">
                <ProgressBar maxValue={maxHealth} currentValue={currentHealth} />
            </div>
            <div className="attack">
                <img className="icon" src="/icons/attack.png" alt="" />
                <span className="value">{attack}</span>
            </div>
            <div className="defence">
                <img className="icon" src="/icons/defence.png" alt="" />
                <span className="value">{defence}</span>
            </div>
        </StyledCombatParticipant>
    );
};

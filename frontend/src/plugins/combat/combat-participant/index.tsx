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

const StyledCombatParticipant = styled.div`
    ${styles}
`;

export const CombatParticipant: FunctionComponent<CombatParticipantProps> = (props: CombatParticipantProps) => {
    const { name, icon, maxHealth, currentHealth, attack, defence, isDead, className } = props;

    return (
        <StyledCombatParticipant isDead={isDead} className={className}>
            <div className="icon">
                <img src={icon} alt="" />
            </div>
            <div className="name">{name}</div>
            <div className="health">
                <ProgressBar maxValue={maxHealth} currentValue={currentHealth} />
            </div>
            <div className="attack">
                <div className="icon" />
                <span className="value">{attack}</span>
            </div>
            <div className="defence">
                <div className="icon" />
                <span className="value">{defence}</span>
            </div>
        </StyledCombatParticipant>
    );
};

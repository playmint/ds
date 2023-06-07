/** @format */

import { css } from 'styled-components';
import { CombatParticipantProps } from './index';

/**
 * Base styles for the combat participant component
 *
 * @param _ The combat participant properties object
 * @return Base styles for the combat participant component
 */
const baseStyles = ({ isDead, isPresent }: Partial<CombatParticipantProps>) => css`
    display: grid;
    grid-template-columns: max-content 1fr max-content;
    grid-template-rows: auto auto;
    gap: 0px 1.2rem;
    grid-auto-flow: row;
    grid-template-areas:
        'icon name attack'
        'icon health defence';
    background: #143063;
    border: 2px solid #487bb3;
    padding: 0.8rem 1.8rem 0.8rem 1.2rem;
    opacity: ${isDead || !isPresent ? 0.5 : 1};

    .icon {
        grid-area: icon;

        img {
            height: 60px;
        }
    }

    .name {
        grid-area: name;
        align-self: center;
        text-transform: uppercase;
    }

    .health {
        grid-area: health;
        align-self: center;
    }

    .attack {
        grid-area: attack;
    }

    .defence {
        grid-area: defence;
    }

    .attack,
    .defence {
        display: flex;
        gap: 0.5rem;
        align-items: center;
        padding-left: 0.5rem;
    }
`;

/**
 * The combat participant component styles
 *
 * @param props The combat participant properties object
 * @return Styles for the combat participant component
 */
export const styles = (props: Partial<CombatParticipantProps>) => css`
    ${baseStyles(props)}
`;

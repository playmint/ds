/** @format */

import { css } from 'styled-components';
import { CombatParticipantProps } from './index';
import { BasePanelStyles } from '@app/styles/base-panel.styles';
import { colors } from '@app/styles/colors';

/**
 * Base styles for the combat participant component
 *
 * @param _ The combat participant properties object
 * @return Base styles for the combat participant component
 */
const baseStyles = ({ isDead }: Pick<CombatParticipantProps, 'isDead'>) => css`
    ${BasePanelStyles}

    display: grid;
    grid-template-columns: max-content 1fr max-content;
    grid-template-rows: auto auto;
    gap: 0px 1.2rem;
    grid-auto-flow: row;
    grid-template-areas:
        'icon name attack'
        'icon health defence';
    opacity: ${isDead ? 0.5 : 1};

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

        .icon {
            mask-image: url('icons/attack.png');
        }
    }

    .defence {
        grid-area: defence;

        .icon {
            mask-image: url('icons/defence.png');
        }
    }

    .attack,
    .defence {
        display: flex;
        gap: 0.5rem;
        align-items: center;
        padding-left: 0.5rem;

        .icon {
            width: 1.5rem;
            height: 1.5rem;
            background-color: ${colors.orange_0};
            mask-size: 100%;
            mask-position: center;
            mask-repeat: no-repeat;
        }
    }
`;

/**
 * The combat participant component styles
 *
 * @param props The combat participant properties object
 * @return Styles for the combat participant component
 */
export const styles = (props: Pick<CombatParticipantProps, 'isDead'>) => css`
    ${baseStyles(props)}
`;

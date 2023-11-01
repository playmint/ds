/** @format */

import { css } from 'styled-components';
import { ActionBarProps } from './index';
import { colors } from '@app/styles/colors';

/**
 * Base styles for the action bar component
 *
 * @param _ The action menu properties object
 * @return Base styles for the action bar component
 */
const baseStyles = (_: Partial<ActionBarProps>) => css`
    pointer-events: all;
    h3 {
        margin-bottom: 0;
    }

    .actions {
        border-radius: 0.8rem;
        border: 3px solid;
        background: ${colors.grey_5};
        display: flex;
        gap: 3px;
        justify-content: center;
        align-items: stretch;
        flex-wrap: nowrap;

        button {
            width: 11.5rem;
            flex-grow: 1;
        }
    }
`;

/**
 * The action bar component styles
 *
 * @param props The action bar properties object
 * @return Styles for the action bar component
 */
export const styles = (props: Partial<ActionBarProps>) => css`
    ${baseStyles(props)}
`;

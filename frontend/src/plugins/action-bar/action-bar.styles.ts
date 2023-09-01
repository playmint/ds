/** @format */

import { css } from 'styled-components';
import { ActionBarProps } from './index';

/**
 * Base styles for the action bar component
 *
 * @param _ The action menu properties object
 * @return Base styles for the action bar component
 */
const baseStyles = (_: Partial<ActionBarProps>) => css`
    min-width: 33vw;
    margin-bottom: 1.5rem;

    h3 {
        margin-bottom: 0;
    }

    .actions {
        display: flex;
        gap: 0.6rem;
        justify-content: center;
        align-items: flex-start;
        flex-wrap: nowrap;

        .action-icon-button {
            width: 30%;
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

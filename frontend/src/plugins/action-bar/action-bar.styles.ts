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
    width: 33vw;
    margin-bottom: 1.5rem;

    h3 {
        margin-bottom: 0;
    }

    .actions {
        width: 100%;
        display: flex;
        gap: 0.6rem;
        justify-content: center;
        align-items: stretch;
        flex-wrap: nowrap;

        .action-icon-button {
            width: 10rem;
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

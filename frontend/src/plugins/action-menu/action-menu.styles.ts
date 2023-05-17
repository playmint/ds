/** @format */

import { css } from 'styled-components';
import { ActionMenuProps } from './index';

/**
 * Base styles for the action menu component
 *
 * @param _ The action menu properties object
 * @return Base styles for the action menu component
 */
const baseStyles = (_: Partial<ActionMenuProps>) => css`
    h3 {
        margin-bottom: 0;
    }

    .actions {
        display: flex;
        gap: 0.6rem;
        justify-content: center;
    }
`;

/**
 * The action menu component styles
 *
 * @param props The action menu properties object
 * @return Styles for the action menu component
 */
export const styles = (props: Partial<ActionMenuProps>) => css`
    ${baseStyles(props)}
`;

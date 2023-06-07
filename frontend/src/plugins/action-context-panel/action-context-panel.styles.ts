/** @format */

import { css } from 'styled-components';
import { ActionContextPanelProps } from './index';

/**
 * Base styles for the action context panel component
 *
 * @param _ The action context panel properties object
 * @return Base styles for the action context panel component
 */
const baseStyles = (_: Partial<ActionContextPanelProps>) => css`
    h3 {
        margin-bottom: 0;
    }

    > .building-image {
        margin: 2rem auto;
        position: relative;
        left: -1rem;
    }

    .secondary-button {
        color: #ccc;
        text-align: center;
        display: inline-block;
    }
    > .action {
        padding: 0 !important;
        border-bottom: 0 !important;
    }
    .process {
        text-align: center;
        width: 100%;
        height: 32px;
        text-overflow: hidden;
    }
    img.arrow {
        display: inline-block;
        width: 32px;
    }

    form {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 1.2rem;

        .ingredients {
            margin: 0 auto;
        }
    }
`;

/**
 * The action context panel component styles
 *
 * @param props The action context panel properties object
 * @return Styles for the action context panel component
 */
export const styles = (props: Partial<ActionContextPanelProps>) => css`
    ${baseStyles(props)}
`;

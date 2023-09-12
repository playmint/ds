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

    .sub-title {
        display: block;
        margin-bottom: 1rem;
        font-size: 1.3rem;
        margin-right: 1rem;
    }

    abbr {
        display: inline-block;
        padding-left: 0.6rem;
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
    > .description {
        margin-bottom: 2rem;
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

    .control {
        position: relative;
        background: rgba(20, 48, 99, 0.85);
        color: white;
        margin: 2.2rem;
        padding: 2rem;
        display: flex;
        align-items: center;

        .guide {
            width: 50%;
        }

        form {
            width: 50%;
            margin: 0;
            padding: 0;
        }

        .cancel {
            position: absolute;
            top: -1rem;
            right: -1rem;
            width: 3.2rem;
            height: 3.2rem;
            border-radius: 20px;
            border: 0;
            border: none;
            border-bottom: 3px solid #b7c5e0;
            padding: 0;
            font-size: 2.2rem;
            font-weight: 800;
            opacity: 0.9;
        }
    }

    > .label {
        width: 12rem;
        height: 1.7rem;
        white-space: nowrap;
        font-size: 1.4rem;
        overflow: hidden;
        text-overflow: ellipsis;
        display: inline-block;
        opacity: 0.4;
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

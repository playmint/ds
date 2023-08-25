/** @format */

import { css } from 'styled-components';
import { DialogProps } from './index';

/**
 * Base styles for the modal component
 *
 * @param _ The modal properties object
 * @return Base styles for the modal component
 */
const baseStyles = ({ width, height }: Partial<DialogProps>) => css`
    border: 0;
    background: transparent;
    overflow: hidden;
    width: ${width};
    ::backdrop {
        background: rgba(15, 15, 15, 0.1);
        backdrop-filter: blur(4px) !important;
        pointer-events: none;
    }
    > .content {
        z-index: 1;
        margin-top: 30px;
        background: #143063;
        color: #fff;
        border: 2px solid #fff;
        width: 100%;
        height: ${height || 'auto'};
        overflow: auto;
    }
    > .icon {
        z-index: 10;
        position: absolute;
        margin-left: calc(50% - 60px);
        top: 0;
    }
    > .icon img {
        width: 94px;
        height: 94px;
    }
    .close-modal-button {
        position: absolute;
        top: 30px;
        right: 4px;
        width: 3.2rem;
        height: 3.2rem;
        border-radius: 20px;
        border: 0;
        border: none;
        border-bottom: 3px solid #b7c5e0;
        padding: 0;
        font-size: 2rem;
        font-weight: 600;
    }
`;

/**
 * component styles
 *
 * @param props The modal properties object
 * @return Styles for the modal component
 */
export const styles = (props: Partial<DialogProps>) => css`
    ${baseStyles(props)}
`;

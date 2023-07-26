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
        backdrop-filter: blur(10px) !important;
        pointer-events: none;
    }
    .content {
        margin-top: 40px;
        background: #143063;
        color: #fff;
        border: 2px solid #fff;
        width: 100%;
        height: ${height};
        overflow: auto;
    }
    .icon {
        position: relative;
        margin-left: calc(50% - 43px);
        top: -5px;
    }
    .diamond-bg {
        position: absolute;
        top: -45px;
        left: 0;
        width: 0;
        height: 0;
        border: 45px solid transparent;
        border-bottom-color: white;
    }
    .diamond-bg:after {
        content: '';
        position: absolute;
        left: -45px;
        top: 45px;
        width: 0;
        height: 0;
        border: 45px solid transparent;
        border-top-color: white;
    }
    .diamond-br-shift {
        position: absolute;
        left: 2px;
        top: 2px;
    }
    .diamond-br {
        position: absolute;
        top: -43px;
        left: 0px;
        width: 0;
        height: 0;
        border: 43px solid transparent;
        border-bottom-color: #143063;
    }
    .diamond-br:after {
        content: '';
        position: absolute;
        left: -43px;
        top: 43px;
        width: 0;
        height: 0;
        border: 43px solid transparent;
        border-top-color: #143063;
    }
    img {
        position: absolute;
        left: 29px;
        top: 25px;
        width: 32px;
        height: 32px;
        filter: invert(100);
    }
    .close {
        position: absolute;
        right: 4px;
        top: 42px;
        border-radius: 20px;
        border: 0px solid transparent;
        width: 3rem;
        height: 3rem;
        font-weight: bold;
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

/** @format */

import { css } from 'styled-components';
import { ModalProps } from './index';

/**
 * Base styles for the modal component
 *
 * @param _ The modal properties object
 * @return Base styles for the modal component
 */
const baseStyles = (_: Partial<ModalProps>) => css`
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 99999;
    background: rgba(15, 15, 15, 0.05);
    backdrop-filter: blur(4px);
    overflow: auto;
    display: flex;
    justify-content: center;
    align-items: center;

    > .close-modal-button {
        position: fixed;
        top: 2rem;
        right: 2rem;
        background: transparent;
        border: 0;
        padding: 0;
        color: white;
        font-size: 4rem;
    }
`;

/**
 * The modal component styles
 *
 * @param props The modal properties object
 * @return Styles for the modal component
 */
export const styles = (props: Partial<ModalProps>) => css`
    ${baseStyles(props)}
`;

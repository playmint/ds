/** @format */

import { css } from 'styled-components';
import { DialogProps } from './index';
import { BasePanelStyles } from '@app/styles/base-panel.styles';
import { colorMap, colors } from '@app/styles/colors';

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
        ${BasePanelStyles}
        z-index: 1;
        margin-top: 30px;
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
        background: ${colorMap.primaryButtonBackground1};
        color: ${colors.orange_0};
        border: solid 1px ${colors.grey_5};
        top: 4px;
        right: 4px;
        width: 2.8rem;
        height: 2.8rem;
        border-radius: 1rem;
        padding: 0;
        font-size: 2rem;
        font-weight: 600;
        line-height: 0;
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

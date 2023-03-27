/** @format */

import { css } from 'styled-components';
import { LogsProps } from './index';

/**
 * Base styles for the tile action component
 *
 * @param _ The tile action properties object
 * @return Base styles for the tile action component
 */
const baseStyles = (_: Partial<LogsProps>) => css`
    .logs {
        position: fixed;
        top: 50px;
        left 0px;
        width: 30vw;
        > .log {
            display: block;
            background: rgba(0,0,0,0.5);
            color:white;
            margin: 10px;
            width: 100%;
            height: 25px;
            text-overflow: ellipsis;
            White-Space: nowrap;
            overflow: hidden;
        }
    }

`;

/**
 * The tile action component styles
 *
 * @param props The tile action properties object
 * @return Styles for the tile action component
 */
export const styles = (props: Partial<LogsProps>) => css`
    ${baseStyles(props)}
`;

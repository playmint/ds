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
        top: 55px;
        left 0px;
        width: 30vw;
        > .log {
            display: block;
            font-family: courier;
            font-size: 1.5rem;
            color:white;
            margin: 0px 0 2px 10px;
            width: 100%;
            text-overflow: ellipsis;
            white-Space: nowrap;
            overflow: hidden;
            height: 25px;
        }
        > .log::before {
            position: relative;
            top: 3px;
            content: url('/icons/log-info.png');
            display: inline-block;
            width: 30px;
            height: 20px;
            margin-right: 4px;
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

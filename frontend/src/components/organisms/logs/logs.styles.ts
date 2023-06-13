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
    max-width: 80rem;
    max-height: 20rem;

    > .log {
        display: block;
        font-family: courier, monospace;
        font-size: 1.5rem;
        color: white;
        margin: 0 0 2px;
        width: 100%;
        text-overflow: ellipsis;
        white-space: nowrap;
        overflow: hidden;
        height: 25px;

        &:before {
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

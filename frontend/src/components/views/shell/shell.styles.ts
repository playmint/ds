/** @format */

import { css } from 'styled-components';
import { ShellProps } from './index';

/**
 * Base styles for the shell component
 *
 * @param _ The shell properties object
 * @return Base styles for the shell component
 */
const baseStyles = (_: Partial<ShellProps>) => css`
    min-height: 100vh;
    margin: 0;

    > .canvas-wrapper {
        position: relative;
        width: 100%;
        height: 100%;

        canvas {
            display: block;
            background: black;
            width: 100%;
            height: 100vh;
        }
    }
`;

/**
 * The shell component styles
 *
 * @param props The shell properties object
 * @return Styles for the shell component
 */
export const styles = (props: Partial<ShellProps>) => css`
    ${baseStyles(props)}
`;

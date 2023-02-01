/** @format */

import { css } from 'styled-components';
import { LoadingBarProps } from './index';

/**
 * Base styles for the loading bar component
 *
 * @param _ The loading bar properties object
 * @return Base styles for the loading bar component
 */
const baseStyles = (_: Partial<LoadingBarProps>) => css`
    display: block;
    width: 100%;
    max-width: 512px;

    .outer {
        width: 100%;
        height: 40px;
        border: 3px solid white;

        .inner {
            width: 0;
            height: 100%;
            background: white;
        }
    }
`;

/**
 * The loading bar component styles
 *
 * @param props The loading bar properties object
 * @return Styles for the loading bar component
 */
export const styles = (props: Partial<LoadingBarProps>) => css`
    ${baseStyles(props)}
`;

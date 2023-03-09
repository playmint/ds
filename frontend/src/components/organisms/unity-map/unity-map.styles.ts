/** @format */

import { css } from 'styled-components';
import { UnityMapProps } from './index';

/**
 * Base styles for the unity map component
 *
 * @param _ The unity map properties object
 * @return Base styles for the unity map component
 */
const baseStyles = (_: Partial<UnityMapProps>) => css`
    > {
        canvas {
            position: absolute;
            width: 100vw;
            height: 100vh;
        }
    }
`;

/**
 * The unity map component styles
 *
 * @param props The unity map properties object
 * @return Styles for the unity map component
 */
export const styles = (props: Partial<UnityMapProps>) => css`
    ${baseStyles(props)}
`;

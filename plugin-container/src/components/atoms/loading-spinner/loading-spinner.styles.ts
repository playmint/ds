/** @format */

import { css, keyframes } from 'styled-components';
import { LoadingSpinnerProps } from './index';

const rotateClockwise = keyframes`
    0% {
        transform: rotate(0);
    }
    100% {
        transform: rotate(360deg);
    }
`;

const rotateAntiClockwise = keyframes`
    0% {
        transform: rotate(0);
    }
    100% {
        transform: rotate(-360deg);
    }
`;

/**
 * Base styles for the loading spinner component
 *
 * @param _ The loading spinner properties object
 * @return Base styles for the loading spinner component
 */
const baseStyles = ({ antiClockwise }: Partial<LoadingSpinnerProps>) => css`
    position: relative;
    width: 10rem;
    aspect-ratio: 1/1;

    .loader-element {
        width: 100%;
        height: 100%;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
    }

    .loader-element img {
        width: 100%;
    }

    .loader-element img {
        animation-name: ${antiClockwise ? rotateAntiClockwise : rotateClockwise};
        animation-iteration-count: infinite;
        animation-timing-function: linear;
        animation-duration: 10s;
    }
`;

/**
 * The loading spinner component styles
 *
 * @param props The loading spinner properties object
 * @return Styles for the loading spinner component
 */
export const styles = (props: Partial<LoadingSpinnerProps>) => css`
    ${baseStyles(props)}
`;

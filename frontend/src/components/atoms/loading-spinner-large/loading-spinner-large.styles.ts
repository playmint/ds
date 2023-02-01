/** @format */

import { css, keyframes } from 'styled-components';
import { LoadingSpinnerLargeProps } from './index';

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
 * Base styles for the loading spinner large component
 *
 * @param _ The loading spinner large properties object
 * @return Base styles for the loading spinner large component
 */
const baseStyles = (_: Partial<LoadingSpinnerLargeProps>) => css`
    position: relative;

    width: 38rem;
    height: 38rem;

    .loader-element {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
    }

    .loader-element.icon {
        width: 62%;
    }

    .loader-element.ring-inner {
        width: 79%;
    }

    .loader-element.ring-outer {
        width: 100%;
    }

    .loader-element img {
        width: 100%;
    }

    .loader-element.ring-inner img {
        animation-name: ${rotateAntiClockwise};
        animation-iteration-count: infinite;
        animation-timing-function: linear;

        animation-duration: 10s;
    }

    .loader-element.ring-outer img {
        animation-name: ${rotateClockwise};
        animation-iteration-count: infinite;
        animation-timing-function: linear;

        animation-duration: 10s;
    }
`;

/**
 * The loading spinner large component styles
 *
 * @param props The loading spinner large properties object
 * @return Styles for the loading spinner large component
 */
export const styles = (props: Partial<LoadingSpinnerLargeProps>) => css`
    ${baseStyles(props)}
`;

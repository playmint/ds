/** @format */

import { css, keyframes } from 'styled-components';

/**
 * Base styles for the layout full component
 *
 * @return Base styles for the layout full component
 */
const baseStyles = () => css`
    position: relative;
    max-width: 1920px;
    min-width: 1040px;
    min-height: 100vh;
    margin: 0 auto;

    > .backplate {
        position: absolute;
        z-index: 1;
        left: 50%;
        transform: translateX(-50%);
        overflow: hidden;
        width: 100%;
        display: flex;
        justify-content: center;

        video {
            min-width: 144rem;
        }
    }

    > header {
        position: relative;
        z-index: 11;
    }

    > main {
        position: relative;
        z-index: 12;
    }

    > header {
        opacity: 0;
        animation: ${fadeIn} 1s ease-in 0.5s 1 normal forwards;
    }

    > main {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        position: relative;
        z-index: 10;
        padding: 2rem 2rem 6rem;
        opacity: 0;
        animation: ${fadeIn} 1s ease-in 0s 1 normal forwards;
    }
`;

const fadeIn = keyframes`
    100% {
        opacity: 1;
    }
`;

/**
 * The layout full component styles
 *
 * @return Styles for the layout full component
 */
export const styles = () => css`
    ${baseStyles()}
`;

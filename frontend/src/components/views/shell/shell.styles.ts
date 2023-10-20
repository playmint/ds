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
    display: flex;
    flex-direction: column;

    > .map-container {
        position: absolute;
        top: 0;
        left: 0;
        bottom: 0;
        right: 0;
    }

    > .hud-container {
        position: relative;
        z-index: 10;
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        grid-template-rows: 1fr 1fr;
        gap: 0 0;
        grid-auto-flow: row;
        grid-template-areas:
            'top-left top-middle right'
            'bottom-left bottom-middle right';
        flex-grow: 1;
        pointer-events: none;

        .top-left,
        .bottom-left,
        .top-middle,
        .bottom-middle,
        .right {
            display: flex;
            flex-direction: column;
            padding: 2.4rem;

            > * {
                pointer-events: all;
            }
        }

        .top-left {
            grid-area: top-left;

            .logs {
                pointer-events: none;
            }
        }

        .bottom-left {
            grid-area: bottom-left;
            align-items: flex-start;
            justify-content: flex-end;
        }

        .top-middle {
            grid-area: top-middle;
            align-items: center;
            justify-content: flex-start;
        }

        .bottom-middle {
            grid-area: bottom-middle;
            align-items: center;
            justify-content: flex-end;
        }

        .right {
            grid-area: right;
            align-items: flex-end;
            justify-content: flex-start;
        }
    }

    .onboarding {
        background: #143063;
        padding: 2rem 2rem;
        width: 50rem;
        color: #fff;
        user-select: none;
        opacity: 0.95;
        a {
            color: #fff;
        }

        > p {
            margin: 2rem 0;
            font-size: 1.6rem;
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

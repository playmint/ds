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

    > .nav-container {
        position: relative;
        z-index: 10;
        display: flex;
        justify-content: flex-start;
        height: 5rem;
        background: #030f25;
        user-select: none;

        button {
            display: flex;
            justify-content: flex-end;
            align-items: center;
            border: 0;
            border-left: 1px solid #314a7b;
            background: #050f25;
            color: #fff;
            padding: 0 2rem 0 1rem;

            > img {
                margin-right: 0.3rem;
            }

            > .text {
                display: block;
                padding-top: 5px;
            }
        }
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
            //border: 1px solid red;
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

    .seeker-actions {
        .seeker-selector {
            display: flex;
            justify-content: flex-end;
            align-items: center;
            overflow: visible;
            min-height: 5rem;
            padding: 1rem;
            background: #143063;

            > .shield {
                position: absolute;
                left: 0.5rem;
                width: 100px;
            }

            > .controls {
                display: flex;
                flex-direction: row;

                .label {
                    padding: 0 0.5rem;
                    text-transform: uppercase;
                }
            }
        }
    }

    .tile-actions,
    .seeker-actions {
        position: relative;
        width: 30rem;
        color: #fff;
        user-select: none;
    }

    .sub-title {
        display: block;
        margin-bottom: 1.2rem;
    }

    .action {
        background: #143063;
        color: #fff;
        padding: 2rem 2rem;
        margin-bottom: 1.2rem;

        > .content {
            display: flex;
            flex-direction: column;
            align-items: center;
        }
    }

    .onboarding {
        background: #143063;
        padding: 2rem 2rem;

        > button {
            border-radius: 30px;
            border: none;
            border-bottom: 4px solid #b7c5e0;
            display: block;
            width: 100%;
            box-sizing: border-box;
            background: #fff;
            color: #143063;
            padding: 1.2rem 2rem 0.8rem;
            font-weight: 600;
        }
        > p {
            margin: 2rem 0;
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

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
    position: relative;
    overflow: hidden;
    height: 100%;
    width: 100%;
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
        display: flex;
        flex-direction: row;
        position: relative;
        max-height: 100vh;
        z-index: 10;
        gap: 0 0;
        flex-grow: 1;
        pointer-events: none;
        justify-content: space-between;

        .flex-spacer {
            flex-grow: 1;
        }

        .left {
            display: flex;
            flex-direction: column;
            padding: 2rem 0 2rem 2rem;
            min-width: 40rem;
            justify-content: space-between;
            flex-grow: 1;

            .top-left {
                display: flex;
                flex-direction: column;
                justify-content: flex-start;
            }

            .bottom-left {
                display: flex;
                flex-direction: row;
                justify-content: space-between;
                height: 24rem;
                align-items: end;
                gap: 1rem;

                .bottom-middle {
                    display: flex;
                    flex-direction: column;
                    justify-content: flex-end;
                    flex-grow: 1;
                    max-width: 50rem;
                }
            }
        }

        .right {
            display: flex;
            flex-direction: column;
            padding: 2rem 2rem 2rem 0;
            min-width: 32rem;
            justify-content: flex-start;

            align-items: flex-end;
            overflow-y: auto;
            position: relative;

            /* START HACK TO GRACEFULLY OVERFLOW SIDEBAR */
            --scrollbar-width: 8px;
            --mask-height: 3rem;
            overflow-y: auto;
            height: 100%;
            padding-bottom: var(--mask-height);
            padding-right: 20px;
            --mask-image-content: linear-gradient(
                to bottom,
                transparent,
                black var(--mask-height),
                black calc(100% - var(--mask-height)),
                transparent
            );
            --mask-size-content: calc(100% - var(--scrollbar-width)) 100%;
            --mask-image-scrollbar: linear-gradient(black, black);
            --mask-size-scrollbar: var(--scrollbar-width) 100%;
            mask-image: var(--mask-image-content), var(--mask-image-scrollbar);
            mask-size: var(--mask-size-content), var(--mask-size-scrollbar);
            mask-position: 0 0, 100% 0;
            mask-repeat: no-repeat, no-repeat;
            /* END HACK TO GRACEFULLY OVERFLOW SIDEBAR */
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

/** @format */

import { css } from 'styled-components';
import { DialogProps } from './index';
import { rgba } from 'polished';

/**
 * Base styles for the dialog component
 *
 * @param _ The dialog properties object
 * @return Base styles for the dialog component
 */
const baseStyles = (_: Partial<DialogProps>) => css`
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 60rem;
    font-size: 1.6rem;
    color: ${rgba('#e3e3e3', 0.9)};

    > .content {
        background: rgba(15, 15, 15, 0.95);
        position: relative;

        > .title-bar {
            display: flex;
            padding: 1rem 3rem;

            .warning-sign {
                width: 2.4rem;
                margin-right: 1rem;
            }

            .title {
                font-size: 2.4rem;
            }

            .close-button {
                position: absolute;
                top: 0.5rem;
                right: 0.5rem;
                background: transparent;
                border: 0;
                padding: 0;

                img {
                    width: 4.2rem;
                    height: auto;
                }
            }
        }

        > .message {
            padding: 2rem 3rem 0;
            text-align: justify;
        }

        > .controls {
            display: flex;
            justify-content: flex-end;
            padding: 2rem 3rem;

            > .cancel-button {
                margin-right: 3rem;
                color: ${rgba('#e3e3e3', 0.75)};
            }

            > .confirm-button {
                padding: 1rem;
                position: relative;
                color: inherit;
                background: transparent;
                border: 1px solid #e3e3e3;
                display: inline-block;
            }
        }

        a {
            text-decoration: underline;
        }
    }
`;

const borderStyles = (_: Partial<DialogProps>) => {
    const cornerDistance = -0.3;

    return css`
        border: 0.1rem solid ${rgba('#D79773', 0.5)};
        padding: 0.3rem;

        > .content {
            border: 0.1rem solid ${rgba('#FFFFFF', 0.25)};
        }

        &:after,
        &:before,
        > .content:after,
        > .content:before {
            content: '';
            display: block;
            background: url('/graphics/dungeon-select-corner.svg') left top no-repeat;
            width: 3.4rem;
            height: 3.4rem;
            position: absolute;
            pointer-events: none;
            opacity: 0.5;
        }

        &:before {
            top: ${cornerDistance}rem;
            left: ${cornerDistance}rem;
        }

        &:after {
            top: ${cornerDistance}rem;
            right: ${cornerDistance}rem;
            transform: scaleX(-1);
        }

        > .content:before {
            bottom: ${2 * cornerDistance}rem;
            left: ${2 * cornerDistance}rem;
            transform: scaleY(-1);
        }

        > .content:after {
            bottom: ${2 * cornerDistance}rem;
            right: ${2 * cornerDistance}rem;
            transform: scale(-1, -1);
        }
    `;
};

/**
 * The dialog component styles
 *
 * @param props The dialog properties object
 * @return Styles for the dialog component
 */
export const styles = (props: Partial<DialogProps>) => css`
    ${baseStyles(props)}
    ${borderStyles(props)}
`;

/** @format */

import { css } from 'styled-components';
import { CombatModalProps } from './index';

/**
 * Base styles for the combat modal component
 *
 * @param _ The combat modal properties object
 * @return Base styles for the combat modal component
 */
const baseStyles = (_: Partial<CombatModalProps>) => css`
    display: flex;
    flex-direction: column;
    position: relative;
    width: 85rem;
    height: 55rem;
    background: #143063;
    color: white;
    border: 2px solid white;

    > .close-modal-button {
        display: block;
        width: 3.2rem;
        height: 3.2rem;
        border-radius: 50%;
        position: absolute;
        top: 0;
        right: 0;
        transform: translate(50%, -50%);
        border: none;
        border-bottom: 3px solid #b7c5e0;
        font-size: 2rem;
        font-weight: 600;
    }

    > .header {
        display: flex;

        .icon {
            display: block;
        }

        .icon,
        .winner {
            position: absolute;
            top: 0;
            left: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
        }

        .winner {
            background: #143063;
            border-top: 2px solid white;
            border-bottom: 2px solid white;
            text-transform: uppercase;
            font-weight: 600;
            font-size: 2.2rem;
            width: 20rem;
            height: 6rem;
            display: flex;
            align-items: center;
            justify-content: center;

            &:before,
            &:after {
                content: '';
                position: absolute;
                width: 4.2rem;
                height: 4.2rem;
                background: #143063;
                transform: rotateZ(45deg);
            }

            &:before {
                left: -2.1rem;
                border-bottom: 2px solid white;
                border-left: 2px solid white;
            }

            &:after {
                right: -2.1rem;
                border-top: 2px solid white;
                border-right: 2px solid white;
            }

            > .content {
                position: relative;
                z-index: 10;
            }
        }

        .attackers,
        .defenders {
            flex-grow: 1;
            padding: 2.4rem 3.2rem;
            max-width: 50%;

            .heading {
                display: block;
                font-weight: 700;
                text-transform: uppercase;
                margin-bottom: 0.5rem;
            }
        }

        .defenders .heading {
            text-align: right;
        }
    }

    > .body {
        display: flex;
        flex-grow: 1;
        background: #061e3d;

        .attackers,
        .defenders {
            flex-grow: 1;
            padding: 2.4rem 3.2rem;
            max-width: 50%;

            .participant {
                margin-bottom: 1.8rem;
            }
        }

        .attackers {
            border-right: 2px solid #143063;
        }

        .defenders {
            border-left: 2px solid #143063;
        }
    }

    > .footer {
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        height: 8.5rem;

        > .action-button {
            margin: 0 auto 1.2rem;
        }
    }
`;

/**
 * The combat modal component styles
 *
 * @param props The combat modal properties object
 * @return Styles for the combat modal component
 */
export const styles = (props: Partial<CombatModalProps>) => css`
    ${baseStyles(props)}
`;

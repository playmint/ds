/** @format */

import { css } from 'styled-components';
import { CombatModalProps } from './index';
import { colorMap } from '@app/styles/colors';

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
    width: 100%;
    height: 55rem;

    > .win-state {
        .winner {
            text-transform: uppercase;
            font-weight: 600;
            font-size: 2.2rem;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            margin: 1rem;

            > .content {
                position: relative;
                z-index: 10;
            }
        }
    }

    > .header {
        display: flex;

        .icon {
            display: block;
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
        position: relative;
        display: flex;
        flex-grow: 1;
        background: ${colorMap.secondaryBackground};
        border-radius: 1rem;
        margin-bottom: 1rem;
        // max-height: 36rem;

        .attackers,
        .defenders {
            flex-grow: 1;
            padding: var(--panel-padding);
            max-width: 50%;
            max-height: 100%;
            overflow: auto;
            scrollbar-color: #007ff7 #000000;
            scrollbar-width: thin;

            &::-webkit-scrollbar {
                width: 0.8em;
            }

            &::-webkit-scrollbar-track {
                background-color: #000000;
            }

            &::-webkit-scrollbar-thumb {
                background-color: #007ff7;
                outline: transparent;
            }

            .participant {
                margin-bottom: 1.8rem;
            }
        }

        .attackers {
            border-right: 2px solid ${colorMap.primaryBackground};
        }

        .defenders {
            border-left: 2px solid ${colorMap.primaryBackground};
        }
    }

    > .footer {
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        // height: 8.5rem;
        margin-top: 0.2rem;

        > .action-button {
            margin: 1rem auto 1.2rem;
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

/** @format */

import { css } from 'styled-components';
import { CombatModalProps } from './index';
import { colorMap, colors } from '@app/styles/colors';

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

    /* overflow: hidden; */

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
        flex-shrink: 1;
        background: ${colorMap.secondaryBackground};
        border-radius: 1rem;
        margin-bottom: 1rem;
        min-height: 0;

        .attackers,
        .defenders {
            flex-grow: 1;
            padding: var(--panel-padding);
            max-width: 50%;
            max-height: 100%;
            overflow: auto;
            scrollbar-color: ${colors.orange_0} ${colors.grey_1};
            scrollbar-width: thin;

            &::-webkit-scrollbar {
                width: 0.8em;
            }

            &::-webkit-scrollbar-track {
                background-color: ${colors.orange_1};
            }

            &::-webkit-scrollbar-thumb {
                background-color: ${colors.orange_0};
                outline: transparent;
            }

            .participant {
                margin-bottom: 0.5rem;
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
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        // height: 8.5rem;
        margin-top: 0.2rem;

        > .action-button {
            margin: 1rem auto 1.2rem;
        }

        > .in-progress {
            margin-bottom: 0.5rem;
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

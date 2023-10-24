/** @format */

import { css } from 'styled-components';
import { TickTimerProgressBarProps } from './index';
import { colors } from '@app/styles/colors';

type TickTimerProgressBarStyleProps = Partial<TickTimerProgressBarProps>;

/**
 * Base styles for the tick timer progress bar component
 *
 * @param _ The tick timer progress bar properties object
 * @return Base styles for the tick timer progress bar component
 */
const baseStyles = (_: TickTimerProgressBarStyleProps) => {
    return css`
        position: relative;
        width: 100%;
        background: #000;
        padding: 0 0.4rem;
        display: flex;
        justify-content: center;
        min-height: 2px;

        .progress-bar {
            position: absolute;
            top: 0;
            bottom: 0;
            left: 0;
            width: 100%;
            transform-origin: center left;
            background: ${colors.orange_0};
        }

        .label {
            position: relative;
            z-index: 10;
        }
    `;
};

/**
 * The tick timer progress bar component styles
 *
 * @param props The tick timer progress bar properties object
 * @return Styles for the tick timer progress bar component
 */
export const styles = (props: TickTimerProgressBarStyleProps) => css`
    ${baseStyles(props)}
`;

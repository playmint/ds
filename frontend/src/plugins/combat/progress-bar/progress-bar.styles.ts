/** @format */

import { css } from 'styled-components';
import { ProgressBarProps } from './index';

/**
 * Base styles for the progress bar component
 *
 * @param _ The progress bar properties object
 * @return Base styles for the progress bar component
 */
const baseStyles = ({ maxValue = 1, currentValue = 0 }: Partial<ProgressBarProps>) => {
    const progress = (currentValue / maxValue) * 100;
    return css`
        position: relative;
        width: 100%;
        background: #000;
        padding: 0 0.4rem;

        .progress-bar {
            position: absolute;
            top: 0;
            bottom: 0;
            left: 0;
            width: 100%;
            transform-origin: center left;
            transform: scaleX(${progress}%);
            background: #007ff7;
        }

        .label {
            position: relative;
            z-index: 10;
        }
    `;
};

/**
 * The progress bar component styles
 *
 * @param props The progress bar properties object
 * @return Styles for the progress bar component
 */
export const styles = (props: Partial<ProgressBarProps>) => css`
    ${baseStyles(props)}
`;

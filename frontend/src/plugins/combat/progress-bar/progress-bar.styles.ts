/** @format */

import { css } from 'styled-components';
import { ProgressBarProps } from './index';
import { colors } from '@app/styles/colors';

/**
 * Base styles for the progress bar component
 *
 * @param _ The progress bar properties object
 * @return Base styles for the progress bar component
 */
const baseStyles = ({ maxValue = 1, currentValue = 0 }: Pick<ProgressBarProps, 'maxValue' | 'currentValue'>) => {
    const progress = (currentValue / maxValue) * 100;
    return css`
        position: relative;
        width: 100%;
        background: ${colors.grey_1};
        padding: 0 0.4rem;
        border-radius: 1rem;
        overflow: hidden;

        .progress-bar {
            position: absolute;
            border-radius: 1rem;
            top: 0;
            bottom: 0;
            left: 0;
            width: 100%;
            transform-origin: center left;
            transform: scaleX(${progress}%);
            transition: transform 200ms linear;
            background: ${colors.orange_0};
            border: 3px solid ${colors.orange_1};
        }

        .label {
            margin-left: 0.5rem;
            font-size: 1.1rem;
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
export const styles = (props: Pick<ProgressBarProps, 'maxValue' | 'currentValue'>) => css`
    ${baseStyles(props)}
`;

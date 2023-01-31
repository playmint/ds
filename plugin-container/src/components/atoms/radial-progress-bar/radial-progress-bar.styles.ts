/** @format */

import { css } from 'styled-components';
import { RadialProgressBarProps } from './index';
import { rgba } from 'polished';

/**
 * Base styles for the radial progress bar component
 *
 * @param props The radial progress bar properties object
 * @return Base styles for the radial progress bar component
 */
const baseStyles = ({
    progressPerCent,
    potentialPerCent,
    contributionPerCent,
    iconWidth,
    progressBarColor,
    contributionBarColor
}: RadialProgressBarProps) => {
    const radius = 40;
    const pi = 3.141567;
    const diameter = Math.ceil(2 * pi * radius);

    // because contribution is shown on the end of the progress bar and all bars start from the same position, this is achieved by setting the contribution to the progress percentage and subtracting the contribution from the progress
    const progress = diameter - ((progressPerCent - contributionPerCent) / 100) * diameter;
    const contribution = diameter - (progressPerCent / 100) * diameter;
    const potential = diameter - (potentialPerCent / 100) * diameter;

    return css`
        display: block;
        aspect-ratio: 1 / 1;
        width: 100%;
        border-radius: 100%;
        position: relative;

        > svg {
            width: 100%;
            height: 100%;

            circle {
                transition: stroke-dashoffset 1s linear;
                stroke: ${rgba('#646464', 0.35)};
                stroke-width: 1.5px;
            }

            .progress-bar,
            .player-contribution,
            .potential-contribution {
                stroke-dasharray: ${diameter};
                stroke-width: 3px;
                transform-origin: center;
                transform: rotate(-90deg);
            }

            .progress-bar {
                stroke: ${progressBarColor};
                stroke-dashoffset: ${progress};
            }

            .player-contribution {
                stroke: ${contributionBarColor};
                stroke-dashoffset: ${contribution};
            }

            .potential-contribution {
                stroke: #2d4b28;
                stroke-dashoffset: ${potential};
            }

            .inner,
            .outer {
                stroke-width: 1px;
            }
        }

        > .icon {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: ${iconWidth}%;
        }
    `;
};

/**
 * The radial progress bar component styles
 *
 * @param props The radial progress bar properties object
 * @return Styles for the radial progress bar component
 */
export const styles = (props: RadialProgressBarProps) => css`
    ${baseStyles(props)}
`;

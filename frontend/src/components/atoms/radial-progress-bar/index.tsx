/** @format */

import { FunctionComponent } from 'react';
import styled from 'styled-components';
import { ComponentProps } from '@app/types/component-props';
import { styles } from './radial-progress-bar.styles';

export interface RadialProgressBarProps extends ComponentProps {
    progressPerCent: number;
    potentialPerCent: number;
    contributionPerCent: number;
    imagePath?: string;
    showInnerCircle?: boolean;
    iconWidth?: number;
    progressBarColor?: string;
    contributionBarColor?: string;
}

const StyledRadialProgressBar = styled('div')`
    ${styles}
`;

export const RadialProgressBar: FunctionComponent<RadialProgressBarProps> = (props: RadialProgressBarProps) => {
    const { imagePath, showInnerCircle = true, iconWidth = 76, ...otherProps } = props;

    return (
        <StyledRadialProgressBar iconWidth={iconWidth} {...otherProps}>
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                {showInnerCircle && <circle className="inner" r="35" cx="50" cy="50" fill="transparent" />}
                <circle r="40" cx="50" cy="50" fill="transparent" />
                <circle className="potential-contribution" r="40" cx="50" cy="50" fill="transparent" />
                <circle className="player-contribution" r="40" cx="50" cy="50" fill="transparent" />
                <circle className="progress-bar" r="40" cx="50" cy="50" fill="transparent" />
                <circle className="outer" r="45" cx="50" cy="50" fill="transparent" />
            </svg>
            <img src={imagePath} alt="" className="icon" />
        </StyledRadialProgressBar>
    );
};

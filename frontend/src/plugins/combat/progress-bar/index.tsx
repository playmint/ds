/** @format */

import { FunctionComponent } from 'react';
import styled from 'styled-components';
import { ComponentProps } from '@app/types/component-props';
import { styles } from './progress-bar.styles';

export interface ProgressBarProps extends ComponentProps {
    maxValue: number;
    currentValue: number;
}

const StyledProgressBar = styled('div')`
    ${styles}
`;

export const ProgressBar: FunctionComponent<ProgressBarProps> = (props: ProgressBarProps) => {
    const { maxValue, currentValue } = props;

    return (
        <StyledProgressBar {...props}>
            <div className="progress-bar"></div>
            <span className="label">
                {currentValue}/{maxValue}
            </span>
        </StyledProgressBar>
    );
};

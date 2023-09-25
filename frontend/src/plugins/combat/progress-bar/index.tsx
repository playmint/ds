/** @format */

import { FunctionComponent } from 'react';
import styled from 'styled-components';
import { ComponentProps } from '@app/types/component-props';
import { styles } from './progress-bar.styles';

export interface ProgressBarProps extends ComponentProps {
    maxValue: number;
    currentValue: number;
}

const StyledProgressBar = styled.div`
    ${styles}
`;

export const ProgressBar: FunctionComponent<ProgressBarProps> = ({ maxValue, currentValue }: ProgressBarProps) => {
    return (
        <StyledProgressBar maxValue={maxValue} currentValue={currentValue}>
            <div className="progress-bar"></div>
            <span className="label">
                {currentValue}/{maxValue}
            </span>
        </StyledProgressBar>
    );
};

/** @format */

import { FunctionComponent } from 'react';
import styled from 'styled-components';
import { ComponentProps } from '@app/types/component-props';
import { styles } from './progress-bar.styles';

export interface ProgressBarProps extends ComponentProps {
    maxValue: number;
    currentValue: number;
    label?: string;
}

const StyledProgressBar = styled.div`
    ${styles}
`;

export const ProgressBar: FunctionComponent<ProgressBarProps> = ({
    maxValue,
    currentValue,
    label,
}: ProgressBarProps) => {
    const displayLabel = label ? label : `${currentValue}/${maxValue}`;
    return (
        <StyledProgressBar maxValue={maxValue} currentValue={currentValue}>
            <div className="progress-bar"></div>
            <span className="label">{displayLabel}</span>
        </StyledProgressBar>
    );
};

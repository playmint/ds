/** @format */

import { FunctionComponent } from 'react';
import styled from 'styled-components';
import { ComponentProps } from '@app/types/component-props';
import { styles } from './loading-spinner.styles';

export interface LoadingSpinnerProps extends ComponentProps {
    antiClockwise?: boolean;
}

const StyledLoadingSpinner = styled('div')`
    ${styles}
`;

export const LoadingSpinner: FunctionComponent<LoadingSpinnerProps> = (props: LoadingSpinnerProps) => {
    const { ...otherProps } = props;

    return (
        <StyledLoadingSpinner {...otherProps}>
            <div className="loader-element ring">
                <img src="/graphics/loader/small/loader-small.svg" alt="" />
            </div>
        </StyledLoadingSpinner>
    );
};

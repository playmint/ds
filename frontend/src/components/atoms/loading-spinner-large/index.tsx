/** @format */

import { FunctionComponent } from 'react';
import styled from 'styled-components';
import { ComponentProps } from '@app/types/component-props';
import { styles } from './loading-spinner-large.styles';

export interface LoadingSpinnerLargeProps extends ComponentProps {}

const StyledLoadingSpinnerLarge = styled('div')`
    ${styles}
`;

export const LoadingSpinnerLarge: FunctionComponent<LoadingSpinnerLargeProps> = (props: LoadingSpinnerLargeProps) => {
    const { ...otherProps } = props;

    return (
        <StyledLoadingSpinnerLarge {...otherProps}>
            <div className="loader-element icon">
                <img src="/graphics/loader/full-screen/order-icon-default.png" />
            </div>
            <div className="loader-element ring-inner">
                <img src="/graphics/loader/full-screen/ring-inner.svg" />
            </div>
            <div className="loader-element ring-outer">
                <img src="/graphics/loader/full-screen/ring-outer.svg" />
            </div>
        </StyledLoadingSpinnerLarge>
    );
};

/** @format */

import { FunctionComponent, ReactNode } from 'react';
import styled from 'styled-components';
import { ComponentProps } from '@app/types/component-props';
import { styles } from './constrained-wrapper.styles';

export interface ConstrainedWrapperProps extends ComponentProps {
    /**
     * Child elements
     */
    children?: ReactNode;
}

const StyledConstrainedWrapper = styled('div')`
    ${styles}
`;

export const ConstrainedWrapper: FunctionComponent<ConstrainedWrapperProps> = (props: ConstrainedWrapperProps) => {
    const { children, ...otherProps } = props;

    return <StyledConstrainedWrapper {...otherProps}>{children}</StyledConstrainedWrapper>;
};

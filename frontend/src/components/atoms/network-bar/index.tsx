/** @format */

import { FunctionComponent, ReactNode } from 'react';
import { ComponentProps } from '@app/types/component-props';
import styled from 'styled-components';
import { styles } from './network-bar.styles';

export interface NetworkBarProps extends ComponentProps {
    children?: ReactNode;
}

const StyledNetworkBar = styled('div')`
    ${styles}
`;

export const NetworkBar: FunctionComponent<NetworkBarProps> = (props: NetworkBarProps) => {
    const { children, ...otherProps } = props;
    return (
        <StyledNetworkBar {...otherProps}>
            <div>{children}</div>
        </StyledNetworkBar>
    );
};

/** @format */

import { FunctionComponent, ReactNode } from 'react';
import styled from 'styled-components';
import { ComponentProps } from '@app/types/component-props';
import { styles } from './ornate-button.styles';

export interface OrnateButtonProps extends ComponentProps {
    href?: string;
    children?: ReactNode;
    onClick?: () => void;
    target?: string;
    rel?: string;
}

const StyledOrnateButton = styled('button')`
    ${styles}
`;

export const OrnateButton: FunctionComponent<OrnateButtonProps> = (props: OrnateButtonProps) => {
    const { href, children, ...otherProps } = props;
    const as = href ? 'a' : 'button';

    return (
        <StyledOrnateButton href={href} {...otherProps} as={as}>
            <span>{children}</span>
        </StyledOrnateButton>
    );
};

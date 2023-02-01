/** @format */

import { forwardRef, LegacyRef, ReactNode } from 'react';
import styled from 'styled-components';
import { ComponentProps } from '@app/types/component-props';
import { styles } from './layout-full.styles';

export interface LayoutFullProps extends ComponentProps {
    children?: ReactNode;
}

const StyledLayoutFull = styled('div')`
    ${styles}
`;

export const LayoutFull = forwardRef<HTMLVideoElement, LayoutFullProps>(
    (props: LayoutFullProps, ref?: LegacyRef<HTMLVideoElement>) => {
        const { children, ...otherProps } = props;

        return (
            <StyledLayoutFull {...otherProps}>
                <div className="backplate">
                    <video src="/backplate.mp4" autoPlay={true} loop={true} muted={true} ref={ref} />
                </div>
                <main>{children}</main>
            </StyledLayoutFull>
        );
    }
);

/** @format */

import { FunctionComponent } from 'react';
import styled from 'styled-components';
import { ComponentProps } from '@app/types/component-props';
import { styles } from './loading-bar.styles';

export interface LoadingBarProps extends ComponentProps {
    progress: number;
}

const StyledLoadingBar = styled('div')`
    ${styles}
`;

export const LoadingBar: FunctionComponent<LoadingBarProps> = (props: LoadingBarProps) => {
    const { progress } = props;
    return (
        <StyledLoadingBar {...props}>
            <div className="outer">
                <div className="inner" style={{ width: `${progress}%` }} />
            </div>
        </StyledLoadingBar>
    );
};

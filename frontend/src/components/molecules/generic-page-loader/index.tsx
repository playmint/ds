/** @format */

import { FunctionComponent } from 'react';
import styled from 'styled-components';
import { ComponentProps } from '@app/types/component-props';
import { styles } from './generic-page-loader.styles';
import { LoadingSpinner } from '@app/components/atoms/loading-spinner';

export interface GenericPageLoaderProps extends ComponentProps {}

const StyledGenericPageLoader = styled('div')`
    ${styles}
`;

export const GenericPageLoader: FunctionComponent<GenericPageLoaderProps> = (props: GenericPageLoaderProps) => {
    const { ...otherProps } = props;

    return (
        <StyledGenericPageLoader {...otherProps}>
            <LoadingSpinner className="loading-spinner" />
            <p className="loading-message">Loading...</p>
        </StyledGenericPageLoader>
    );
};

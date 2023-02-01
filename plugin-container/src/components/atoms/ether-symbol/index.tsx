/** @format */

import { FunctionComponent } from 'react';
import styled from 'styled-components';
import { ComponentProps } from '@app/types/component-props';
import { styles } from './ether-symbol.styles';

export interface EtherSymbolProps extends ComponentProps {}

const StyledEtherSymbol = styled('span')`
    ${styles}
`;

export const EtherSymbol: FunctionComponent<EtherSymbolProps> = (props: EtherSymbolProps) => {
    const { ...otherProps } = props;

    return <StyledEtherSymbol {...otherProps}>Ether</StyledEtherSymbol>;
};

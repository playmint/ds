---
to: src/components/<%= h.getComponentDirectory(type) %>/<%= h.changeCase.param(name) %>/index.tsx
---
/** @format */

import { FunctionComponent, ReactNode } from 'react';
import styled from 'styled-components';
import { ComponentProps } from '@app/types/component-props';
import { styles } from './<%= h.changeCase.param(name) %>.styles';

export interface <%= h.changeCase.pascal(name) %>Props extends ComponentProps {
    children?: ReactNode;
}

const Styled<%= h.changeCase.pascal(name) %> = styled('div')`
    ${styles}
`;

export const <%= h.changeCase.pascal(name) %>: FunctionComponent<<%= h.changeCase.pascal(name) %>Props> = (props: <%= h.changeCase.pascal(name) %>Props) => {
    const { children, ...otherProps } = props;

    return <Styled<%= h.changeCase.pascal(name) %> {...otherProps}>{children}</Styled<%= h.changeCase.pascal(name) %>>;
};

/** @format */

import { css } from 'styled-components';
import { EtherSymbolProps } from './index';

/**
 * Base styles for the ether symbol component
 *
 * @param _ The ether symbol properties object
 * @return Base styles for the ether symbol component
 */
const baseStyles = (_: Partial<EtherSymbolProps>) => css`
    display: inline-block;
    font-family: sans-serif;
    font-size: 90%;
    text-indent: -9999px;
    line-height: 0;

    &:after {
        display: block;
        content: 'Ξ';
        text-indent: 0;
        line-height: initial;
    }
`;

/**
 * The ether symbol component styles
 *
 * @param props The ether symbol properties object
 * @return Styles for the ether symbol component
 */
export const styles = (props: Partial<EtherSymbolProps>) => css`
    ${baseStyles(props)}
`;

/** @format */

import { css } from 'styled-components';
import { NetworkBarProps } from './index';

/**
 * Base styles for the ornate button component
 *
 * @return Base styles for the ornate button component
 */
const baseStyles = () => css`
    padding: 1em;
    text-align: center;
    background: #333;
    color: #fff;
    font-size: 1.8em;

    button {
        background: #ddd;
        margin: 0 0.5em;
        height: 3rem;
        border-radius: 0.7rem;
        cursor: pointer;
        border-width: 0;
    }
`;

/**
 * The network bar component styles
 *
 * @return Styles for the network network component
 */
export const styles = (_: NetworkBarProps) => css`
    ${baseStyles()}
`;

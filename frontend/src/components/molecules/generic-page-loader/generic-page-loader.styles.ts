/** @format */

import { css } from 'styled-components';
import { GenericPageLoaderProps } from './index';

/**
 * Base styles for the generic page loader component
 *
 * @param _ The generic page loader properties object
 * @return Base styles for the generic page loader component
 */
const baseStyles = (_: Partial<GenericPageLoaderProps>) => css`
    .loading-spinner {
        margin-top: 3rem;
        margin-bottom: 1em;
    }

    .loading-message {
        font-size: 2rem;
        color: #b3b3b3;
    }
`;

/**
 * The generic page loader component styles
 *
 * @param props The generic page loader properties object
 * @return Styles for the generic page loader component
 */
export const styles = (props: Partial<GenericPageLoaderProps>) => css`
    ${baseStyles(props)}
`;

/** @format */

import { css } from 'styled-components';

/**
 * Base styles for the constrained wrapper component
 *
 * @return Base styles for the constrained wrapper component
 */
const baseStyles = () => css`
    max-width: 100rem;
    margin: 0 auto;
    padding-top: 6rem;
`;

/**
 * The constrained wrapper component styles
 *
 * @return Styles for the constrained wrapper component
 */
export const styles = () => css`
    ${baseStyles()}
`;

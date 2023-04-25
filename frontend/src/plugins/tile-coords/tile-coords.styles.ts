/** @format */

import { css } from 'styled-components';
import { TileCoordsProps } from './index';

/**
 * Base styles for the seeker list component
 *
 * @param _ The seeker list properties object
 * @return Base styles for the seeker list component
 */
const baseStyles = (_: Partial<TileCoordsProps>) => css`
    h3 {
        margin-bottom: 0;
    }
`;

/**
 * The seeker list component styles
 *
 * @param props The seeker list properties object
 * @return Styles for the seeker list component
 */
export const styles = (props: Partial<TileCoordsProps>) => css`
    ${baseStyles(props)}
`;

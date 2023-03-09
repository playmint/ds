/** @format */

import { css } from 'styled-components';
import { TileActionProps } from './index';

/**
 * Base styles for the tile action component
 *
 * @param _ The tile action properties object
 * @return Base styles for the tile action component
 */
const baseStyles = (_: Partial<TileActionProps>) => css``;

/**
 * The tile action component styles
 *
 * @param props The tile action properties object
 * @return Styles for the tile action component
 */
export const styles = (props: Partial<TileActionProps>) => css`
    ${baseStyles(props)}
`;

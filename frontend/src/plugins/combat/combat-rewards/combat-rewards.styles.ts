/** @format */

import { css } from 'styled-components';
import { CombatRewardsProps } from './index';

/**
 * Base styles for the combat rewards component
 *
 * @param _ The combat rewards properties object
 * @return Base styles for the combat rewards component
 */
const baseStyles = (_: Partial<CombatRewardsProps>) => css``;

/**
 * The combat rewards component styles
 *
 * @param props The combat rewards properties object
 * @return Styles for the combat rewards component
 */
export const styles = (props: Partial<CombatRewardsProps>) => css`
    ${baseStyles(props)}
`;

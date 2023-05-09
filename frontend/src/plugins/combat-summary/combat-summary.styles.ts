/** @format */

import { css } from 'styled-components';
import { CombatSummaryProps } from './index';

/**
 * Base styles for the seeker list component
 *
 * @param _ The seeker list properties object
 * @return Base styles for the seeker list component
 */
const baseStyles = (_: Partial<CombatSummaryProps>) => css`
    width: 30rem;
`;

/**
 * The seeker list component styles
 *
 * @param props The seeker list properties object
 * @return Styles for the seeker list component
 */
export const styles = (props: Partial<CombatSummaryProps>) => css`
    ${baseStyles(props)}
`;

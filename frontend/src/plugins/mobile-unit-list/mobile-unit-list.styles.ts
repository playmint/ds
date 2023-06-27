/** @format */

import { css } from 'styled-components';
import { MobileUnitListProps } from './index';

/**
 * Base styles for the mobileUnit list component
 *
 * @param _ The mobileUnit list properties object
 * @return Base styles for the mobileUnit list component
 */
const baseStyles = (_: Partial<MobileUnitListProps>) => css`
    > .mobileUnit {
        position: relative;
        background: #030f25;
        margin-left: 1rem;
        text-transform: uppercase;
        padding: 0.7rem 0 0.7rem 6rem;
        margin-bottom: 2.4rem;

        img {
            position: absolute;
            left: -2rem;
            top: 50%;
            transform: translateY(-50%);
            width: 6.5rem;
        }
    }
`;

/**
 * The mobileUnit list component styles
 *
 * @param props The mobileUnit list properties object
 * @return Styles for the mobileUnit list component
 */
export const styles = (props: Partial<MobileUnitListProps>) => css`
    ${baseStyles(props)}
`;

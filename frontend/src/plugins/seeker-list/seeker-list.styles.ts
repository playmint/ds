/** @format */

import { css } from 'styled-components';
import { SeekerListProps } from './index';

/**
 * Base styles for the seeker list component
 *
 * @param _ The seeker list properties object
 * @return Base styles for the seeker list component
 */
const baseStyles = (_: Partial<SeekerListProps>) => css`
    > .seeker {
        position: relative;
        background: #030f25;
        margin-left: 1rem;
        text-transform: uppercase;
        padding: 0.7rem 0 0.7rem 6rem;
        margin-bottom: 2.4rem;

        img {
            position: absolute;
            left: -1rem;
            top: 50%;
            transform: translateY(-50%);
        }
    }
`;

/**
 * The seeker list component styles
 *
 * @param props The seeker list properties object
 * @return Styles for the seeker list component
 */
export const styles = (props: Partial<SeekerListProps>) => css`
    ${baseStyles(props)}
`;

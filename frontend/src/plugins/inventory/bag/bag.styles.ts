/** @format */

import { css } from 'styled-components';
import { BagProps } from './index';

/**
 * Base styles for the bag component
 *
 * @param _ The bag properties object
 * @return Base styles for the bag component
 */
const baseStyles = (_: Partial<BagProps>) => css`
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;

    > .icon {
        width: 3.2rem;
        height: 3.2rem;
    }

    > .slots {
        display: flex;
        flex-direction: row;
        margin-left: 1.6rem;

        li:not(:first-child) {
            margin-left: 0.6rem;
        }
    }
`;

/**
 * The bag component styles
 *
 * @param props The bag properties object
 * @return Styles for the bag component
 */
export const styles = (props: Partial<BagProps>) => css`
    ${baseStyles(props)}
`;

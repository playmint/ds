/** @format */

import { css } from 'styled-components';
import { BagItemProps } from './index';

type BagItemStyleProps = Partial<BagItemProps> & {
    isPickable: boolean;
};

/**
 * Base styles for the bag item component
 *
 * @param _ The bag item properties object
 * @return Base styles for the bag item component
 */
const baseStyles = ({ isPickable }: BagItemStyleProps) => css`
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 4.8rem;
    aspect-ratio: 1 / 1;
    background: #030f25;
    cursor: ${isPickable ? 'pointer' : 'auto'};

    .icon {
    }

    .amount {
        position: absolute;
        bottom: 0;
        right: 2px;
        font-size: 1.2rem;
        color: white;
    }
`;

/**
 * The bag item component styles
 *
 * @param props The bag item properties object
 * @return Styles for the bag item component
 */
export const styles = (props: BagItemStyleProps) => css`
    ${baseStyles(props)}
`;

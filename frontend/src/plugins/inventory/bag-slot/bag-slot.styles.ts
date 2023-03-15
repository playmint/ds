/** @format */

import { css } from 'styled-components';
import { BagSlotProps } from './index';

type BagSlotStyleProps = Partial<BagSlotProps> & {
    isDroppable: boolean;
};

/**
 * Base styles for the bag slot component
 *
 * @param _ The bag slot properties object
 * @return Base styles for the bag slot component
 */
const baseStyles = ({ isDroppable, isDisabled }: BagSlotStyleProps) => css`
    box-sizing: content-box;
    width: 4.8rem;
    height: 4.8rem;
    background: ${isDisabled ? '#19212e' : '#030f25'};
    border: 1px solid ${isDisabled ? '#656585' : isDroppable ? 'white' : '#6c98d4'};
`;

/**
 * The bag slot component styles
 *
 * @param props The bag slot properties object
 * @return Styles for the bag slot component
 */
export const styles = (props: BagSlotStyleProps) => css`
    ${baseStyles(props)}
`;

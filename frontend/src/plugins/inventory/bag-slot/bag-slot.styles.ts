/** @format */

import { css } from 'styled-components';
import { BagSlotProps } from './index';

type BagSlotStyleProps = Partial<BagSlotProps> & {
    isDroppable: boolean;
    isInvalid: boolean;
};

/**
 * Base styles for the bag slot component
 *
 * @param _ The bag slot properties object
 * @return Base styles for the bag slot component
 */
const baseStyles = ({ isDroppable, isDisabled, isInteractable, isInvalid }: BagSlotStyleProps) => css`
    box-sizing: content-box;
    width: 4.8rem;
    height: 4.8rem;
    background: ${isDisabled || !isInteractable ? '#19212e' : '#030f25'};
    border: 1px solid
        ${isDisabled || !isInteractable ? '#656585' : isInvalid ? 'red' : isDroppable ? 'white' : '#6c98d4'};

    .placeholder {
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
        width: 4.8rem;
        aspect-ratio: 1 / 1;
        background: transparent;
        opacity: 0.3;

        .icon {
            filter: invert(100%);
            width: 50%;
        }

        .amount {
            position: absolute;
            bottom: 0;
            right: 2px;
            font-size: 1.2rem;
            color: white;
        }
    }
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

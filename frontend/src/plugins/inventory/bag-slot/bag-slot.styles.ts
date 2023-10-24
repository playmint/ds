/** @format */

import { css } from 'styled-components';
import { BagSlotProps } from './index';
import { colorMap, colors } from '@app/styles/colors';

type BagSlotStyleProps = Partial<BagSlotProps> & {
    isDroppable: boolean;
    isInvalid: boolean;
    hasItem: boolean;
};

/**
 * Base styles for the bag slot component
 *
 * @param _ The bag slot properties object
 * @return Base styles for the bag slot component
 */
const baseStyles = ({ isDroppable, isDisabled, isInteractable, isInvalid, hasItem }: BagSlotStyleProps) => css`
    box-sizing: content-box;
    width: 4.8rem;
    height: 4.8rem;
    border-radius: 0.8rem;
    overflow: hidden;
    background: ${isDisabled || !isInteractable ? colorMap.secondaryBackground : colors.grey_0};
    border: 2px solid
        ${isDisabled || !isInteractable
            ? colorMap.secondaryBackground
            : isInvalid
            ? 'red'
            : isDroppable
            ? colors.orange_0
            : hasItem
            ? colors.grey_5
            : colorMap.secondaryBackground};

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
            width: 100%;
            height: 100%;
            mask-size: 50%;
            mask-repeat: no-repeat;
            mask-position: center;
        }

        .amount {
            position: absolute;
            bottom: 0;
            right: 2px;
            font-size: 1rem;
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

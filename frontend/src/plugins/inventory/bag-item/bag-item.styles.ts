/** @format */

import { css, keyframes } from 'styled-components';
import { BagItemProps } from './index';
import { colors } from '@app/styles/colors';

type BagItemStyleProps = Partial<BagItemProps> & {
    isPickable: boolean;
};

/**
 * Base styles for the bag item component
 *
 * @param _ The bag item properties object
 * @return Base styles for the bag item component
 */
const baseStyles = ({ isPickable, isInteractable }: BagItemStyleProps) => css`
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 4.8rem;
    aspect-ratio: 1 / 1;
    background: ${!isInteractable ? '#19212e' : colors.grey_5};
    cursor: ${isPickable && !isInteractable ? 'pointer' : 'auto'};

    .icon {
        width: 100%;
        height: 100%;
        mask-size: 50%;
        mask-repeat: no-repeat;
        mask-position: center;
    }

    .amount {
        position: absolute;
        line-height: 0;
        bottom: 0.6rem;
        right: 0.2rem;
        font-size: 1rem;
        color: white;
        font-weight: 800;

        > .padding {
            color: ${colors.grey_4};
        }
    }

    .spinner {
        display: block;
        width: 1rem;
        height: 1rem;
        position: absolute;
        top: 0.2rem;
        right: 0.2rem;
        border: 1px solid white;
        border-left-color: transparent;
        border-radius: 0.5rem;
        animation-name: ${spinAnimation};
        animation-duration: 0.5s;
        animation-iteration-count: infinite;
        animation-timing-function: linear;
    }
`;

const spinAnimation = keyframes`
    100% { transform:rotate(360deg); }
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

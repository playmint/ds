/** @format */

import { css, keyframes } from 'styled-components';
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
const baseStyles = ({ isPickable, isInteractable }: BagItemStyleProps) => css`
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 4.8rem;
    aspect-ratio: 1 / 1;
    background: ${!isInteractable ? '#19212e' : '#030f25'};
    cursor: ${isPickable && !isInteractable ? 'pointer' : 'auto'};

    .icon {
        filter: invert(100%);
        width: 60%;
        opacity: 0.9;
    }

    .amount {
        position: absolute;
        bottom: 0;
        right: 2px;
        font-size: 1.2rem;
        color: white;
    }

    .spinner {
        display: block;
        width: 1rem;
        height: 1rem;
        position: absolute;
        top: 2px;
        right: 2px;
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

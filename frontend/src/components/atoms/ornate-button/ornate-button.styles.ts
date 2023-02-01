/** @format */

import { css } from 'styled-components';
import { colors } from '@app/styles/colors';
import { OrnateButtonProps } from './index';

/**
 * Base styles for the ornate button component
 *
 * @return Base styles for the ornate button component
 */
const baseStyles = () => css`
    position: relative;
    font-size: 3.2rem;
    color: inherit;
    background: transparent;
    border: 1px solid ${colors.grey};
    padding: 1.5rem 6rem;
    display: inline-block;

    &:after,
    &:before,
    > span:after,
    > span:before {
        content: '';
        display: block;
        background: url('/graphics/enter-button-corner.svg') left top no-repeat;
        width: 3.4rem;
        height: 3.4rem;
        position: absolute;
        pointer-events: none;
    }

    &:before {
        top: -1rem;
        left: -1rem;
    }

    &:after {
        top: -1rem;
        right: -1rem;
        transform: scaleX(-1);
    }

    > span:before {
        bottom: -1rem;
        left: -1rem;
        transform: scaleY(-1);
    }

    > span:after {
        bottom: -1rem;
        right: -1rem;
        transform: scale(-1, -1);
    }
`;

/**
 * The ornate button component styles
 *
 * @return Styles for the ornate button component
 */
export const styles = (_: OrnateButtonProps) => css`
    ${baseStyles()}
`;

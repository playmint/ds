/** @format */

import { css } from 'styled-components';
import { TileCoordsProps } from './index';

/**
 * Base styles for the mobileUnit list component
 *
 * @param _ The mobileUnit list properties object
 * @return Base styles for the mobileUnit list component
 */
const baseStyles = (_: Partial<TileCoordsProps>) => css`
    width: 30rem;

    .tile-container {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .element,
    .axis {
        position: absolute;
        left: 50%;
        top: 50%;
    }

    .axis {
        color: #143063;
    }

    .axis.q {
        transform: translate(-19px, -3px);
    }

    .axis.r {
        transform: translate(22px, -21px);
    }

    .axis.s {
        transform: translate(-17px, -40px);
    }

    .element.q {
        width: 50px;
        text-align: right;
        transform: translate(-76px, 39px);
    }

    .element.r {
        transform: translate(50px, -18px);
    }

    .element.s {
        width: 50px;
        text-align: right;
        transform: translate(-76px, -63px);
    }

    .gooRating > span {
        margin-right: 1rem;
    }
`;

/**
 * The mobileUnit list component styles
 *
 * @param props The mobileUnit list properties object
 * @return Styles for the mobileUnit list component
 */
export const styles = (props: Partial<TileCoordsProps>) => css`
    ${baseStyles(props)}
`;

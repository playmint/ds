/** @format */

import { css } from 'styled-components';
import { MobileUnitListProps } from './index';
import { colors } from '@app/styles/colors';

/**
 * Base styles for the mobileUnit list component
 *
 * @param _ The mobileUnit list properties object
 * @return Base styles for the mobileUnit list component
 */
const baseStyles = (_: Partial<MobileUnitListProps>) => css`
    .mobileUnitListItem {
        margin-bottom: 2rem;
    }
    .mobileUnit {
        font-weight: 800;
        position: relative;
        margin-left: 1rem;
        padding: 0.7rem 0 0.7rem 4rem;
        margin-bottom: 2.4rem;

        > img {
            position: absolute;
            left: -1rem;
            top: 50%;
            transform: translateY(-50%);
            width: 4rem;
        }

        > .hashTag {
            color: ${colors.orange_0};
        }
    }
`;

/**
 * The mobileUnit list component styles
 *
 * @param props The mobileUnit list properties object
 * @return Styles for the mobileUnit list component
 */
export const styles = (props: Partial<MobileUnitListProps>) => css`
    ${baseStyles(props)}
`;

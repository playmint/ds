/** @format */

import { css } from 'styled-components';
import { CombatSummaryProps } from './index';

/**
 * Base styles for the mobileUnit list component
 *
 * @param _ The mobileUnit list properties object
 * @return Base styles for the mobileUnit list component
 */
const baseStyles = (_: Partial<CombatSummaryProps>) => css`
    > .header {
        display: flex;
        align-items: center;

        .icon {
            width: 5rem;
        }

        .title {
            margin: 0 0 0 0.6rem;
        }
    }

    > .content {
        display: flex;
        flex-direction: column;
        width: 100%;

        .attackers,
        .defenders {
            width: 100%;
        }

        .attackers {
            margin-top: 2rem;
            margin-bottom: 0.5rem;
        }

        .defenders {
            margin-bottom: 2rem;
        }
    }
`;

/**
 * The mobileUnit list component styles
 *
 * @param props The mobileUnit list properties object
 * @return Styles for the mobileUnit list component
 */
export const styles = (props: Partial<CombatSummaryProps>) => css`
    ${baseStyles(props)}
`;

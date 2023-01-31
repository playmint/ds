/** @format */

import { css } from 'styled-components';
import { UnityPluginProps } from './index';

type UnityPluginStyleProps = Partial<UnityPluginProps> & {
    isLoading: boolean;
};

/**
 * Base styles for the seeker soul summoning altar component
 *
 * @param props The seeker soul summoning altar properties object
 * @return Base styles for the seeker soul summoning altar component
 */
const baseStyles = ({ isLoading }: UnityPluginStyleProps) => {
    if (!isLoading) {
        return css`
            height: 0;
        `;
    }

    return css`
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
};

/**
 * The seeker soul summoning altar component styles
 *
 * @param props The seeker soul summoning altar properties object
 * @return Styles for the seeker soul summoning altar component
 */
export const styles = (props: UnityPluginStyleProps) => css`
    ${baseStyles(props)}
`;

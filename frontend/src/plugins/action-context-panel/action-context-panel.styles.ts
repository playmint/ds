import { css } from 'styled-components';
import { ActionContextPanelProps } from './index';
import { BasePanelStyles } from '@app/styles/base-panel.styles';
import { colorMap, colors } from '@app/styles/colors';

/**
 * Base styles for the action context panel component
 *
 * @param _ The action context panel properties object
 * @return Base styles for the action context panel component
 */
const baseStyles = (_: Partial<ActionContextPanelProps>) => css`
    ${BasePanelStyles}

    position: relative;
    display: flex;
    align-items: center;
    margin-bottom: 1.5rem;
    width: 33vw;

    .guide {
        width: 50%;
    }

    form {
        width: 50%;
        margin: 0;
        padding: 0;
    }

    .cancel {
        position: absolute;
        top: -1rem;
        right: -1rem;
        width: 3.2rem;
        height: 3.2rem;
        border-radius: 20px;
        padding: 0;
        font-size: 2.2rem;
        font-weight: 800;
        color: ${colorMap.primaryButtonText};
        background: ${colorMap.primaryBackground};
        border-color: ${colors.grey_5};
        line-height: 0;
    }

    .sub-title {
        display: block;
        margin-bottom: 1rem;
        font-size: 1.3rem;
        margin-right: 1rem;
    }

    abbr {
        display: inline-block;
        padding-left: 0.6rem;
    }

    form {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 1.2rem;
    }
`;

/**
 * The action context panel component styles
 *
 * @param props The action context panel properties object
 * @return Styles for the action context panel component
 */
export const styles = (props: Partial<ActionContextPanelProps>) => css`
    ${baseStyles(props)}
`;

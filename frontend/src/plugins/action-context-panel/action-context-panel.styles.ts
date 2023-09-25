import { css } from 'styled-components';
import { ActionContextPanelProps } from './index';

/**
 * Base styles for the action context panel component
 *
 * @param _ The action context panel properties object
 * @return Base styles for the action context panel component
 */
const baseStyles = (_: Partial<ActionContextPanelProps>) => css`
    color: #fff;

    position: relative;
    background: rgba(20, 48, 99, 0.85);
    margin: 2.2rem;
    padding: 2rem;
    display: flex;
    align-items: center;
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
        border: 0;
        border: none;
        border-bottom: 3px solid #b7c5e0;
        padding: 0;
        font-size: 2.2rem;
        font-weight: 800;
        opacity: 0.9;
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

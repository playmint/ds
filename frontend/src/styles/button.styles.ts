import styled, { css } from 'styled-components';
import { colorMap } from './colors';

const BaseButtonStyle = css`
    background: linear-gradient(${colorMap.primaryButtonBackground2}, ${colorMap.primaryButtonBackground1} 35%);
    border: ${colorMap.primaryBorderColor} 3px solid;
    padding: 1.2rem 2rem 0.8rem;
    border-radius: 0.8rem;
    position: relative;
    display: block;
    box-sizing: border-box;
    pointer-events: all;
    height: 5rem;

    &:disabled {
        opacity: 0.5;
        pointer-events: none;
    }
    &:hover,
    &.toggleOn {
        background: ${colorMap.primaryButtonHoverBackground};
        color: ${colorMap.primaryButtonHoverText};
        opacity: 1;
    }

    &:active {
        background: ${colorMap.primaryButtonActiveBackground};
    }
`;

export const TextButton = styled.button`
    ${BaseButtonStyle}

    color: ${colorMap.primaryButtonText};
    font-size: 1.6rem;
    font-weight: 800;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
`;

export const ActionButton = styled(TextButton)`
    width: 100%;
`;

export const UnitActionButton = styled(TextButton)`
    border: none;
    width: 5rem;
    padding: 1.2rem 0rem 0.8rem;
`;

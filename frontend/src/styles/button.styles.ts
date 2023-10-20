import styled, { css } from 'styled-components';
import { colorMap } from './colors';

const BaseButtonStyle = css`
    background: ${colorMap.primaryButtonBackground};
    padding: 1.2rem 2rem 0.8rem;

    border-radius: 3rem;
    border: none;
    border-bottom: 4px solid #b7c5e0;
    display: block;
    box-sizing: border-box;
    &:disabled {
        opacity: 0.5;
    }
`;

export const TextButton = styled.button`
    ${BaseButtonStyle}

    color: ${colorMap.primaryButtonText};
    font-weight: 600;
    width: 100%;
    max-width: 26rem;
`;

export const ActionButton = styled(TextButton)``;

export const UnitActionButton = styled(TextButton)`
    border-radius: 0.5rem;
    width: 5rem;
    height: 5rem;
    padding: 1.2rem 0rem 0.8rem;

    &.active {
        background: #ddeeff;
        opacity: 1;
    }

    &.short {
        height: 3.5rem;
        padding: 0rem 0rem 0rem;
    }
`;

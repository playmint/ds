import styled, { css } from 'styled-components';

const tooltipTextColor = 'white';
const tooltipBackgroundColor = 'black';
const tooltipMargin = '30px';
const tooltipArrowSize = '6px';

export const TooltipWrapper = styled.div`
    display: inline-block;
    position: relative;
`;

export const TooltipTip = styled.div<{ direction?: 'top' | 'right' | 'bottom' | 'left' }>`
    position: absolute;
    border-radius: 4px;
    left: 50%;
    transform: translateX(-50%);
    padding: 6px;
    color: ${tooltipTextColor};
    background: ${tooltipBackgroundColor};
    font-size: 14px;
    font-family: 'Recursive', monospace;
    line-height: 1;
    z-index: 100;
    width: max-content;
    white-space: pre-line;
    margin-top: -125%;

    &::before {
        content: ' ';
        left: 50%;
        border: solid transparent;
        height: 0;
        width: 0;
        position: absolute;
        pointer-events: none;
        border-width: ${tooltipArrowSize};
        margin-left: calc(${tooltipArrowSize} * -1);
    }

    ${(props) =>
        props.direction === 'top' &&
        css`
            top: calc(${tooltipMargin} * -1);

            &::before {
                top: 100%;
                border-top-color: ${tooltipBackgroundColor};
            }
        `}

    ${(props) =>
        props.direction === 'right' &&
        css`
            left: calc(100% + ${tooltipMargin});
            top: 50%;
            transform: translateX(0) translateY(-50%);

            &::before {
                left: calc(${tooltipArrowSize} * -1);
                top: 50%;
                transform: translateX(0) translateY(-50%);
                border-right-color: ${tooltipBackgroundColor};
            }
        `}

  ${(props) =>
        props.direction === 'bottom' &&
        css`
            bottom: calc(${tooltipMargin} * -1);

            &::before {
                bottom: 100%;
                border-bottom-color: ${tooltipBackgroundColor};
            }
        `}

  ${(props) =>
        props.direction === 'left' &&
        css`
            left: auto;
            right: calc(100% + ${tooltipMargin});
            top: 50%;
            transform: translateX(0) translateY(-50%);

            &::before {
                left: auto;
                right: calc(${tooltipArrowSize} * -2);
                top: 50%;
                transform: translateX(0) translateY(-50%);
                border-left-color: ${tooltipBackgroundColor};
            }
        `}
`;

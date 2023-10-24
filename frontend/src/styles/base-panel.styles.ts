import styled, { css } from 'styled-components';
import { colorMap } from './colors';

export const BasePanelStyles = css`
    --panel-padding: 1.5rem;

    position: relative;
    background: ${colorMap.primaryBackground};
    color: ${colorMap.primaryText};
    border-radius: 1.2rem;
    padding: var(--panel-padding);
    border: ${colorMap.primaryBorderColor} 3px solid;
`;

export const StyledBasePanel = styled.div`
    ${BasePanelStyles}
`;

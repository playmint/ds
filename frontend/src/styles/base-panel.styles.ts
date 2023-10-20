import { css } from 'styled-components';
import { colorMap } from './colors';

export const BasePanelStyles = css`
    --panel-padding: 1.5rem;

    background: ${colorMap.primaryBackground};
    color: ${colorMap.primaryText};
    border-radius: 1rem;
    padding: var(--panel-padding);
    border: ${colorMap.primaryBorderColor} 3px solid;
`;

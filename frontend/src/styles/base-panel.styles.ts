import { css } from 'styled-components';
import { colorMap } from './colors';

export const BasePanelStyles = css`
    background: ${colorMap.primaryBackground};
    color: ${colorMap.primaryText};
    border-radius: 1rem;
    padding: 1.5rem;
`;

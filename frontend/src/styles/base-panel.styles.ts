import styled, { css } from 'styled-components';
import { colorMap, colors } from './colors';

export const BasePanelStyles = css`
    --panel-padding: 1.5rem;
    --panel-border-radius: 1.2rem;

    position: relative;
    background: ${colorMap.primaryBackground};
    color: ${colorMap.primaryText};
    border-radius: var(--panel-border-radius);
    padding: var(--panel-padding);
    border: ${colorMap.primaryBorderColor} 3px solid;
`;

export const StyledBasePanel = styled.div`
    ${BasePanelStyles}
`;
export const StyledHeaderPanel = styled(StyledBasePanel)`
    flex-shrink: 0;
    padding: 0;
    > .header {
        border-radius: var(--panel-border-radius) var(--panel-border-radius) 0 0;
        padding: var(--panel-padding);
        background: ${colorMap.secondaryBackground};
        color: ${colors.grey_3};

        h1,
        h2,
        h3,
        h4 {
            color: ${colorMap.primaryText};
        }

        > *:last-child {
            margin-bottom: 0;
        }
    }

    > .content {
        padding: var(--panel-padding);
    }
`;

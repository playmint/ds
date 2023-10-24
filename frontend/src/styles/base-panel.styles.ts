import styled, { css } from 'styled-components';
import { colorMap, colors } from './colors';

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
export const StyledHeaderPanel = styled(StyledBasePanel)`
    overflow: hidden;
    padding: 0;
    > .header {
        padding: var(--panel-padding);
        background: ${colorMap.secondaryBackground};
        color: ${colors.grey_3};

        h1,
        h2,
        h3,
        h4 {
            color: ${colorMap.primaryText};
        }
    }

    > .content {
        padding: var(--panel-padding);
    }
`;

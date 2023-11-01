import { PluginType, PluginUpdateResponse } from '@app/../../core/src';
import { PluginContent } from '../organisms/tile-action';
import styled from 'styled-components';
import { BasePanelStyles } from '@app/styles/base-panel.styles';

const StyledItemPluginPanel = styled.div`
    ${BasePanelStyles}
    width: 26rem;
`;

export const ItemPluginPanel = ({ ui }: { ui: PluginUpdateResponse[] }) => {
    const itemPluginStates = ui
        .filter((p) => p.config.type === PluginType.ITEM)
        .flatMap((p) => p.state.components.flatMap((c) => c.content));

    return (
        <>
            {itemPluginStates.length > 0 && (
                <StyledItemPluginPanel>
                    {itemPluginStates.map((content, idx) =>
                        content ? <PluginContent key={idx} content={content} canUse={true} /> : undefined
                    )}
                </StyledItemPluginPanel>
            )}
        </>
    );
};

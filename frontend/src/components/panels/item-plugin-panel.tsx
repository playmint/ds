import { PluginType } from '@app/../../core/src';
import { usePluginState } from '@app/hooks/use-game-state';
import { PluginContent } from '../organisms/tile-action';
import styled from 'styled-components';

const Panel = styled.div`
    background: #143063;
    color: #fff;
    padding: 2rem 2rem;
    margin-bottom: 1.2rem;
`;

export const ItemPluginPanel = () => {
    const ui = usePluginState();
    const itemPluginStates = (ui || [])
        .filter((p) => p.config.type === PluginType.ITEM)
        .flatMap((p) => p.state.components.flatMap((c) => c.content));

    return (
        <>
            {itemPluginStates.length > 0 && (
                <Panel>
                    {itemPluginStates.map((content, idx) =>
                        content ? <PluginContent key={idx} content={content} canUse={true} /> : undefined
                    )}
                </Panel>
            )}
        </>
    );
};

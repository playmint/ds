import { PluginType, PluginUpdateResponse } from '@app/../../core/src';
import { PluginContent } from '../organisms/tile-action';

export const ItemPluginPanel = ({ ui }: { ui: PluginUpdateResponse[] }) => {
    const itemPluginStates = ui
        .filter((p) => p.config.type === PluginType.ITEM)
        .flatMap((p) => p.state.components.flatMap((c) => c.content));

    return (
        <>
            {itemPluginStates.length > 0 && (
                <div>
                    {itemPluginStates.map((content, idx) =>
                        content ? <PluginContent key={idx} content={content} canUse={true} /> : undefined
                    )}
                </div>
            )}
        </>
    );
};

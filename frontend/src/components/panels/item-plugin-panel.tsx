import { PluginType } from '@app/../../core/src';
import { usePluginState } from '@app/hooks/use-game-state';
import { PluginContent } from '../organisms/tile-action';

export const ItemPluginPanel = () => {
    const ui = usePluginState();
    const itemPluginStates = (ui || [])
        .filter((p) => p.config.type === PluginType.ITEM)
        .flatMap((p) => p.state.components.flatMap((c) => c.content));

    return (
        <>
            {itemPluginStates.length > 0 && (
                <div className="tile-actions action">
                    <div className="controls">
                        {itemPluginStates.map((content, idx) =>
                            content ? <PluginContent key={idx} content={content} /> : undefined
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

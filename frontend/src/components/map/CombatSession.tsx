import { getTileHeight } from '@app/helpers/tile';
import { WorldTileFragment, getCoords } from '@downstream/core';
import { memo, useMemo } from 'react';
import { TileHighlight } from './TileHighlight';

export const CombatSessions = memo(({ tiles }: { tiles: WorldTileFragment[] }) => {
    const activeCombatHighlights = useMemo(() => {
        if (!tiles) {
            return [];
        }
        return tiles
            .filter((t) => !!t.session)
            .map((t) => (
                <TileHighlight
                    key={`session-${t.id}`}
                    id={`session-${t.id}`}
                    height={getTileHeight(t)}
                    color="red"
                    style="gradient_outline"
                    animation="none"
                    {...getCoords(t)}
                />
            ));
    }, [tiles]);

    return <>{activeCombatHighlights}</>;
});

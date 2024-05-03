import { getTileHeight } from '@app/helpers/tile';
import { WorldTileFragment, getCoords } from '@downstream/core';
import { memo, useMemo } from 'react';
import { TileHighlight } from './TileHighlight';
import { getSessionsAtTile } from '@downstream/core/src/utils';
import { WorldCombatSessionFragment } from '@downstream/core/src/gql/graphql';

export const CombatSessions = memo(
    ({ tiles, sessions }: { tiles: WorldTileFragment[]; sessions: WorldCombatSessionFragment[] }) => {
        const activeCombatHighlights = useMemo(() => {
            if (!tiles) {
                return [];
            }
            return tiles
                .filter((t) => getSessionsAtTile(sessions, t).some(() => true))
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
        }, [tiles, sessions]);

        return <>{activeCombatHighlights}</>;
    }
);

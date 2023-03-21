import { concatMap, map, pipe, Source, switchMap } from 'wonka';
import { GetSelectedTileDocument, SelectedTileFragment, WorldStateFragment, WorldTileFragment } from './gql/graphql';
import { CogServices } from './types';

/**
 * makeTiles checks that the provided ids exist in the world data before
 * attempting to request more detailed tile data
 *
 * only data for scouted tiles is requested, but unscouted tiles remain in the
 * selection
 */
export function makeTiles(
    client: Source<CogServices>,
    world: Source<WorldStateFragment>,
    ids: Source<string[] | undefined>,
) {
    return pipe(
        client,
        switchMap(({ query, gameID }) =>
            pipe(
                world,
                switchMap(({ tiles: worldTiles }) =>
                    pipe(
                        ids,
                        concatMap((selectedIDs) =>
                            pipe(
                                query(GetSelectedTileDocument, {
                                    gameID,
                                    id:
                                        selectedIDs && selectedIDs.length > 0
                                            ? selectedIDs
                                            : ['fixme-cog-returns-all-matches-for-empty-list'],
                                }),
                                map((res) => res.data),
                                map((data) =>
                                    data && data.game.state.tiles.length > 0
                                        ? data.game.state.tiles
                                        : ([] satisfies SelectedTileFragment[]),
                                ),
                                map((fetchedTiles) => extendWorldTileOrDrop(fetchedTiles, worldTiles, selectedIDs)),
                            ),
                        ),
                    ),
                ),
            ),
        ),
    );
}

/**
 * extendWorldTileOrDrop takes the requested selection of ids and attempts to
 * map them into their full WorldTileFragment.
 *
 * if a selected id is not available in the world list, then it is dropped
 *
 * if it is found in the world data, then we try to upgrade it to a
 * SelectedTileFragment by using the data returned from the fetch.
 *
 * if we cannot upgrade it, we will assume the data is coming later and stub it
 * out for now.
 *
 */
function extendWorldTileOrDrop(fetchedTiles: SelectedTileFragment[], worldTiles: WorldTileFragment[], ids?: string[]) {
    if (!ids || ids.length === 0) {
        return [] as SelectedTileFragment[];
    }
    return (ids || [])
        .map((id) => {
            const worldTile = worldTiles.find((t) => t.id == id);
            const selectedTile = fetchedTiles.find((t) => t.id == id);
            return worldTile ? { ...upgradeWorldTileToSelectedTile(worldTile), ...(selectedTile || {}) } : null;
        })
        .filter((t): t is SelectedTileFragment => !!t);
}

/**
 * adds mock data for any missing properties so WorldTile can be treated as a
 * SelectedTile.
 *
 */
function upgradeWorldTileToSelectedTile(t: WorldTileFragment): SelectedTileFragment {
    return {
        ...t,
        bags: [],
    };
}

import { concat, debounce, fromValue, lazy, map, pipe, share, Source, switchMap, tap } from 'wonka';
import { WorldTileFragment } from './gql/graphql';
import { CogServices } from './types';

/**
 * makeTiles checks that the provided ids exist in the world data before
 * attempting to request more detailed tile data
 *
 * only data for scouted tiles is requested, but unscouted tiles remain in the
 * selection
 */
export function makeSelectedTiles(
    _client: Source<CogServices>, // remove
    tiles: Source<WorldTileFragment[]>,
    ids: Source<string[] | undefined>,
) {
    let prev: WorldTileFragment[];
    const source = pipe(
        tiles,
        switchMap((tiles) =>
            pipe(
                ids,
                map((selectedIDs) =>
                    selectedIDs
                        ? selectedIDs
                              .map((id) => tiles.find((t) => t.id === id))
                              .filter((t): t is WorldTileFragment => !!t)
                        : ([] as WorldTileFragment[]),
                ),
            ),
        ),
        tap((next) => (prev = next)),
        share,
    );
    return pipe(
        lazy(() => (prev ? concat([fromValue(prev), source]) : source)),
        debounce(() => 10),
    );
}

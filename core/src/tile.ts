import { concat, debounce, fromValue, lazy, map, pipe, share, Source, switchMap, tap } from 'wonka';
import { SelectedTileFragment, WorldStateFragment } from './gql/graphql';
import { CogServices } from './types';

/**
 * makeTiles checks that the provided ids exist in the world data before
 * attempting to request more detailed tile data
 *
 * only data for scouted tiles is requested, but unscouted tiles remain in the
 * selection
 */
export function makeTiles(
    _client: Source<CogServices>, // remove
    world: Source<WorldStateFragment>,
    ids: Source<string[] | undefined>,
) {
    let prev: SelectedTileFragment[];
    const source = pipe(
        world,
        switchMap((world) =>
            pipe(
                ids,
                map((selectedIDs) =>
                    selectedIDs
                        ? selectedIDs
                              .map((id) => world.tiles.find((t) => t.id === id))
                              .filter((t): t is SelectedTileFragment => !!t)
                        : ([] as SelectedTileFragment[]),
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

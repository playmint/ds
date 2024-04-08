import { concat, debounce, fromValue, lazy, map, pipe, share, Source, switchMap, tap } from 'wonka';
import { WorldTileFragment } from './gql/graphql';
import { CogServices } from './types';
import { ZoneWithBags } from './world';

export function makeSelectedTiles(
    _client: Source<CogServices>, // remove
    zone: Source<ZoneWithBags>,
    ids: Source<string[] | undefined>,
) {
    let prev: WorldTileFragment[];
    const source = pipe(
        zone,
        switchMap((zone) =>
            pipe(
                ids,
                map((selectedIDs) =>
                    selectedIDs
                        ? selectedIDs
                              .map((id) => zone.tiles.find((t) => t.id === id))
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

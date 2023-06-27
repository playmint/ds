import { concat, debounce, fromValue, lazy, map, pipe, share, Source, switchMap, tap, zip } from 'wonka';
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
    client: Source<CogServices>,
    world: Source<WorldStateFragment>,
    ids: Source<string[] | undefined>,
) {
    let prev: SelectedTileFragment[];
    const source = pipe(
        zip<any>({ client, world }),
        switchMap<any, SelectedTileFragment[]>(({ world }: { client: CogServices; world: WorldStateFragment }) =>
            pipe(
                ids,
                debounce(() => 100),
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

// function makeSelectedTileQuery(
//     client: CogServices,
//     world: WorldStateFragment,
//     selectedIDs?: string[],
// ): Source<SelectedTileFragment[]> {
//     if (selectedIDs == undefined || selectedIDs.length == 0) {
//         return fromValue([]);
//     }
//     return pipe(
//         client.query(GetSelectedTileDocument, {
//             gameID: client.gameID,
//             id: selectedIDs,
//         }),
//         map(({ game }) =>
//             game && game.state.tiles.length > 0 ? game.state.tiles : ([] satisfies SelectedTileFragment[]),
//         ),
//         map((fetchedTiles) => extendWorldTileOrDrop(fetchedTiles, world.tiles, selectedIDs)),
//     );
// }

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
// function extendWorldTileOrDrop(fetchedTiles: SelectedTileFragment[], worldTiles: WorldTileFragment[], ids?: string[]) {
//     if (!ids || ids.length === 0) {
//         return [] as SelectedTileFragment[];
//     }
//     return (ids || [])
//         .map((id) => {
//             const worldTile = worldTiles.find((t) => t.id == id);
//             const selectedTile = fetchedTiles.find((t) => t.id == id);
//             return worldTile ? { ...upgradeWorldTileToSelectedTile(worldTile), ...(selectedTile || {}) } : null;
//         })
//         .filter((t): t is SelectedTileFragment => !!t);
// }

/**
 * adds mock data for any missing properties so WorldTile can be treated as a
 * SelectedTile.
 *
 */
// function upgradeWorldTileToSelectedTile(t: WorldTileFragment): SelectedTileFragment {
//     return {
//         ...t,
//         bags: [],
//         building: t.building
//             ? {
//                   ...t.building,
//               }
//             : null,
//         seekers: t.seekers ? t.seekers.map((s) => ({ ...s, bags: [] })) : [],
//     };
// }

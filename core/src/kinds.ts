import { lazy, tap, map, pipe, share, Source, switchMap, concat, fromValue } from 'wonka';
import { BuildingKindFragment, GetAvailableBuildingKindsDocument } from './gql/graphql';
import { CogServices } from './types';

export function makeAvailableBuildingKinds(client: Source<CogServices>) {
    let prev: BuildingKindFragment[];
    const source = pipe(
        client,
        switchMap(({ query, gameID }) =>
            pipe(
                query(GetAvailableBuildingKindsDocument, { gameID }, { poll: 30 * 1000 }),
                map((data) => data.game.state.kinds),
            ),
        ),
        tap((next) => (prev = next)),
        share,
    ) satisfies Source<BuildingKindFragment[]>;

    const kinds = lazy(() => (prev ? concat([fromValue(prev), source]) : source));

    return { kinds };
}

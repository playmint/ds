import { concat, filter, fromValue, interval, map, pipe, Source, switchMap } from 'wonka';
import { BuildingKindFragment, GetAvailableBuildingKindsDocument } from './gql/graphql';
import { CogServices } from './types';

export function makeAvailableBuildingKinds(client: Source<CogServices>) {
    const kinds = pipe(
        client,
        switchMap((client) =>
            pipe(
                concat([fromValue(1), interval(1000 * 30)]),
                map(() => client),
            ),
        ),
        switchMap(({ query, gameID }) =>
            pipe(
                query(GetAvailableBuildingKindsDocument, { gameID }),
                map((res) => (res.data ? res.data.game.state.kinds : undefined)),
                filter((kinds): kinds is BuildingKindFragment[] => !!kinds),
            ),
        ),
    ) satisfies Source<BuildingKindFragment[]>;
    return { kinds };
}

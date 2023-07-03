import { map, pipe, Source, switchMap } from 'wonka';
import { BuildingKindFragment, GetAvailableBuildingKindsDocument } from './gql/graphql';
import { CogServices } from './types';

export function makeAvailableBuildingKinds(client: Source<CogServices>) {
    const kinds = pipe(
        client,
        switchMap(({ query, gameID }) =>
            pipe(
                query(GetAvailableBuildingKindsDocument, { gameID }),
                map((data) => data.game.state.kinds),
            ),
        ),
    ) satisfies Source<BuildingKindFragment[]>;
    return { kinds };
}

import { Source, map, pipe, switchMap } from 'wonka';
import { GetAvailablePluginsDocument } from './gql/graphql';
import { CogServices } from './types';

/**
 * makeAvailablePlugins polls for the list of deployed plugins every now and
 * then (60s).
 *
 * we don't fetch on every subscription notification because this list could be
 * large and is not important that it is right up to date.
 *
 */
export function makeAvailablePlugins(client: Source<CogServices>) {
    return pipe(
        client,
        switchMap(({ query, gameID }) =>
            pipe(
                query(GetAvailablePluginsDocument, { gameID }, { poll: 60 * 1000 }),
                map(({ game }) => game.state.plugins),
            ),
        ),
    );
}

export function sleep(ms: number): Promise<null> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

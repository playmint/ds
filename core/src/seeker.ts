import { map, pipe, Source, switchMap } from 'wonka';
import { SelectedPlayerFragment } from './gql/graphql';

/**
 * makePlayerSeeker checks if the provided seeker id exists on the current player
 * before either voiding the selection or selecting that seeker
 *
 * if no seeker selection is requested then we default to the first seeker.
 */
export function makePlayerSeeker(player: Source<SelectedPlayerFragment | undefined>, id: Source<string | undefined>) {
    return pipe(
        player,
        switchMap((player) =>
            pipe(
                id,
                map((id) => {
                    const seeker = player ? player.seekers.find((s) => s.id === id) : undefined;
                    return seeker;
                }),
            ),
        ),
    );
}

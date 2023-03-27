import { debounce, filter, map, merge, pipe, scan, Source } from 'wonka';
import { ConnectedPlayer, Selection, GameState, World } from './types';

/**
 * makeState is a helper to merge player+world+selection together into the State object.
 * this State is the same state sent to plugins as their view of the world, and generally
 * can be used as a snapshot of the current game state.
 *
 * the resulting source will block until world has arrived.
 */
export function makeGameState(
    player: Source<ConnectedPlayer | undefined>,
    world: Source<World>,
    selection: Source<Selection>,
) {
    return pipe(
        merge<Partial<GameState>>([
            pipe(
                player,
                map((player) => ({ player })),
            ),
            pipe(
                world,
                map((world) => ({ world })),
            ),
            pipe(
                selection,
                map((selected) => ({ selected })),
            ),
        ]),
        scan((inputs, v) => ({ ...inputs, ...v }), {} as Partial<GameState>),
        filter((inputs): inputs is GameState => !!inputs.world),
        debounce(() => 25),
    ) satisfies Source<GameState>;
}

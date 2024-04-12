import { filter, map, merge, pipe, scan, Source } from 'wonka';
import { ConnectedPlayer, GameState, SelectedMapElement, Selection, Selector } from './types';
import { GlobalState, ZoneWithBags } from './world';

/**
 * makeState is a helper to merge player+world+selection together into the State object.
 * this State is the same state sent to plugins as their view of the world, and generally
 * can be used as a snapshot of the current game state.
 *
 * the resulting source will block until world has arrived.
 */
export function makeGameState(
    player: Source<ConnectedPlayer | undefined>,
    zone: Source<ZoneWithBags>,
    global: Source<GlobalState>,
    selection: Source<Selection>,
    selectTiles: Selector<string[] | undefined>,
    selectMobileUnit: Selector<string | undefined>,
    selectIntent: Selector<string | undefined>,
    selectMapElement: Selector<SelectedMapElement | undefined>,
) {
    return pipe(
        merge<Partial<GameState>>([
            pipe(
                player,
                map((player) => ({ player })),
            ),
            pipe(
                zone,
                map((zone) => ({ zone })),
            ),
            pipe(
                global,
                map((global) => ({ global })),
            ),
            pipe(
                selection,
                map((selected) => ({ selected })),
            ),
        ]),
        scan(
            (inputs, v) => ({ selectTiles, selectMobileUnit, selectIntent, selectMapElement, ...inputs, ...v }),
            {} as Partial<GameState>,
        ),
        filter((inputs): inputs is GameState => !!inputs.zone && !!inputs.global),
    ) satisfies Source<GameState>;
}

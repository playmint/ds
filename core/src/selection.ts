import {
    concat,
    debounce,
    fromValue,
    lazy,
    makeSubject,
    map,
    merge,
    pipe,
    scan,
    share,
    Source,
    switchMap,
    tap,
} from 'wonka';
import { makePlayerSeeker } from './seeker';
import { makeTiles } from './tile';
import { CogServices, ConnectedPlayer, Selection, Selector, World } from './types';

export function makeSelection(
    client: Source<CogServices>,
    world: Source<World>,
    player: Source<ConnectedPlayer | undefined>,
) {
    const { selector: selectSeeker, selection: selectedSeekerID } = makeSelector<string | undefined>(player);
    const selectedSeeker = makePlayerSeeker(player, selectedSeekerID);

    const { selector: selectTiles, selection: selectedTileIDs } = makeSelector<string[] | undefined>(player);
    const selectedTiles = makeTiles(client, world, selectedTileIDs);

    const { selector: selectIntent, selection: selectedIntent } = makeSelector<string | undefined>(player);

    let prev: any;
    const selectionPipe = pipe(
        merge<Partial<Selection>>([
            pipe(
                selectedSeeker,
                map((seeker) => ({ seeker })),
            ),
            pipe(
                selectedTiles,
                map((tiles) => ({ tiles })),
            ),
            pipe(
                selectedIntent,
                map((intent) => ({ intent })),
            ),
        ]),
        scan((inputs, v) => ({ ...inputs, ...v }), {} as Selection),
        debounce(() => 10),
        tap((next) => (prev = next)),
        share,
    ) satisfies Source<Selection>;

    const selection = pipe(
        lazy(() => (prev ? concat([fromValue(prev), selectionPipe]) : selectionPipe)),
        debounce(() => 10),
    );

    return { selection, selectSeeker, selectTiles, selectIntent };
}

/**
 * makeSelector creates a function+source for a given player stream to be used
 * for selecting runtime state.
 *
 * for example:
 *
 * ```ts
 * const { selector: selectSeekerID, selection: seekerID } = makeSelector<string>();
 *
 * selectSeekerID('xxxxx')   // update the selection to 'xxxxx'
 *
 * pipe(
 *  seekerID,
 *  subscribe(() => console.log('seeker id selection changed'))
 * )
 * ```
 *
 * A new selection state is created each time the player source changes.
 *
 */
export function makeSelector<T>(player: Source<ConnectedPlayer | undefined>, initialValue?: T) {
    const { source, next } = makeSubject<T>();
    const prev = new Map<string, T | undefined>();
    const init = (playerID: string) => {
        if (!prev.has(playerID)) {
            prev.set(playerID, initialValue);
        }
        const v = prev.get(playerID);
        return concat([fromValue(v), source]);
    };
    const selection = pipe(
        player,
        switchMap((player) =>
            pipe(
                lazy(() => init(player ? player.id : '')),
                tap((v) => prev.set(player ? player.id : '', v)),
            ),
        ),
    );
    const selector: Selector<T> = (v: T) => next(v);
    return { selector, selection };
}

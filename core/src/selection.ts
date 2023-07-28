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
import { makePlayerMobileUnit } from './mobile-unit';
import { makeTiles } from './tile';
import { CogServices, ConnectedPlayer, Selection, Selector, World } from './types';

export function makeSelection(
    client: Source<CogServices>,
    world: Source<World>,
    player: Source<ConnectedPlayer | undefined>,
) {
    const { selector: selectMobileUnit, selection: selectedMobileUnitID } = makeSelector<string | undefined>(player);
    const selectedMobileUnit = makePlayerMobileUnit(player, selectedMobileUnitID);

    const { selector: selectTiles, selection: selectedTileIDs } = makeSelector<string[] | undefined>(player);
    const selectedTiles = makeTiles(client, world, selectedTileIDs);

    const { selector: selectIntent, selection: selectedIntent } = makeSelector<string | undefined>(player);

    const { selector: selectMapElement, selection: selectedMapElement } = makeSelector<string | undefined>(player);
    //const selectedMapElement = makePlayerMobileUnit(player, selectedMobileUnitID);

    let prev: any;
    const selectionPipe = pipe(
        merge<Partial<Selection>>([
            pipe(
                selectedMobileUnit,
                map((mobileUnit) => ({ mobileUnit })),
            ),
            pipe(
                selectedTiles,
                map((tiles) => ({ tiles })),
            ),
            pipe(
                selectedIntent,
                map((intent) => ({ intent })),
            ),
            pipe(
                selectedMapElement,
                map((mapElement) => ({ mapElement })),
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

    return { selection, selectMobileUnit, selectTiles, selectIntent, selectMapElement };
}

/**
 * makeSelector creates a function+source for a given player stream to be used
 * for selecting runtime state.
 *
 * for example:
 *
 * ```ts
 * const { selector: selectMobileUnitID, selection: mobileUnitID } = makeSelector<string>();
 *
 * selectMobileUnitID('xxxxx')   // update the selection to 'xxxxx'
 *
 * pipe(
 *  mobileUnitID,
 *  subscribe(() => console.log('mobileUnit id selection changed'))
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

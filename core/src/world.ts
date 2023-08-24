import { ethers } from 'ethers';
import { concat, debounce, fromValue, lazy, map, pipe, share, Source, switchMap, tap } from 'wonka';
import { GetWorldDocument, GetWorldQuery, WorldStateFragment } from './gql/graphql';
import { CogServices } from './types';

/**
 * makeWorldState subscribes to changes to the world state.
 *
 * The "world state" is basically everything we need to draw the map, but not
 * _every_ detail. For example we gather all Tiles, and fetch the Bag ids on
 * those tiles, but we do not fetch the contents of all those bags. The
 * SelectedTile/SelectedMobileUnit/etc states hold more detailed information.
 *
 */
export function makeWorld(cog: Source<CogServices>) {
    let prev: WorldStateFragment | undefined;

    const world = pipe(
        cog,
        switchMap(({ query, gameID }) => query(GetWorldDocument, { gameID })),
        map(normalizeWorldState),
        tap((next) => (prev = next)),
        share,
    );

    return pipe(
        lazy(() => (prev ? concat([fromValue(prev), world]) : world)),
        debounce(() => 10),
    );
}

function normalizeWorldState({ game }: GetWorldQuery): WorldStateFragment {
    return game.state satisfies WorldStateFragment;
}

export function getCoords({ coords }) {
    return {
        q: Number(ethers.fromTwos(coords[1], 16)),
        r: Number(ethers.fromTwos(coords[2], 16)),
        s: Number(ethers.fromTwos(coords[3], 16)),
    };
}

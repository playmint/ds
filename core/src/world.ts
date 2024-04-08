import { ethers } from 'ethers';
import { concat, debounce, fromValue, lazy, map, pipe, share, Source, switchMap, tap } from 'wonka';
import {
    GetTilesDocument,
    GetWorldDocument,
    GetWorldQuery,
    WorldStateFragment,
    WorldTileFragment,
} from './gql/graphql';
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

export function makeTiles(cog: Source<CogServices>) {
    let prev: WorldTileFragment[] | undefined;

    const tiles = pipe(
        cog,
        switchMap(({ query, gameID }) => query(GetTilesDocument, { gameID }, { poll: 60 * 1000 * 10 })),
        map(({ game }) => game?.state?.tiles.filter((tile) => tile.biome === 1) || []),
        tap((next) => (prev = next)),
        share,
    );

    return pipe(
        lazy(() => (prev ? concat([fromValue(prev), tiles]) : tiles)),
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

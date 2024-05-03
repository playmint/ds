import { ethers } from 'ethers';
import { filter, concat, debounce, fromValue, lazy, map, pipe, share, Source, switchMap, tap } from 'wonka';
import { BagFragment, GetGlobalDocument, GetZoneDocument, GetZoneQuery, GlobalStateFragment } from './gql/graphql';
import { CogServices } from './types';

export type ZoneWithBags = GetZoneQuery['game']['state']['zone'] & { bags: BagFragment[] };
export type Equipee = { bags: BagFragment[] };

function flatMapBags(equipees: Equipee[]): BagFragment[] {
    return equipees.flatMap((e) => e.bags);
}

/**
 * makeWorldState subscribes to changes to the world state.
 *
 * The "world state" is basically everything we need to draw the map, but not
 * _every_ detail. For example we gather all Tiles, and fetch the Bag ids on
 * those tiles, but we do not fetch the contents of all those bags. The
 * SelectedTile/SelectedMobileUnit/etc states hold more detailed information.
 *
 */
export function makeZone(cog: Source<CogServices>, zoneID: string) {
    let prev: ZoneWithBags | undefined;

    const world = pipe(
        cog,
        switchMap(({ query, gameID }) => query(GetZoneDocument, { gameID, zoneID: zoneID ? zoneID : '__NOZONE' })),
        map((res) => {
            if (!res || !res.game || !res.game.state || !res.game.state.zone) {
                return undefined;
            }
            // find all the bags and put them in the zone we do this because the
            // frontend currently expects a single big list of all available
            // bags, not bags attached to things, but bags attached to things is
            // the only sensible way to track which bags are visible in the zone
            const bags = [
                ...flatMapBags(res.game.state.zone.mobileUnits),
                ...flatMapBags(res.game.state.zone.buildings),
                ...flatMapBags(res.game.state.zone.tiles),
            ];

            // include the bags in the zone
            const resWithBags: ZoneWithBags = {
                ...res.game.state.zone,
                bags,
            };

            return resWithBags;
        }),
        filter((next): next is ZoneWithBags => !!next),
        tap((next) => (prev = next)),
        share,
    );

    return pipe(
        lazy(() => (prev ? concat([fromValue(prev), world]) : world)),
        debounce(() => 10),
    );
}

export type GlobalState = GlobalStateFragment & { gameID: string };

export function makeGlobal(cog: Source<CogServices>) {
    let prev: GlobalState | undefined;

    const global = pipe(
        cog,
        switchMap(({ query, gameID }) => query(GetGlobalDocument, { gameID })),
        map((next) => ({ ...next.game?.state, gameID: next.game?.id })),
        tap((next) => (prev = next)),
        share,
    );

    return pipe(
        lazy(() => (prev ? concat([fromValue(prev), global]) : global)),
        debounce(() => 10),
    );
}

export function getCoords({ coords }) {
    return {
        z: Number(ethers.fromTwos(coords[0], 16)),
        q: Number(ethers.fromTwos(coords[1], 16)),
        r: Number(ethers.fromTwos(coords[2], 16)),
        s: Number(ethers.fromTwos(coords[3], 16)),
    };
}

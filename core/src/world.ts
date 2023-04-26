import { ethers } from 'ethers';
import { debounce, map, pipe, Source, switchMap } from 'wonka';
import { GetWorldDocument, GetWorldQuery, WorldStateFragment, WorldTileFragment } from './gql/graphql';
import { CompoundKeyEncoder, NodeSelectors } from './helpers';
import { BiomeKind, CogServices } from './types';

/**
 * makeWorldState subscribes to changes to the world state.
 *
 * The "world state" is basically everything we need to draw the map, but not
 * _every_ detail. For example we gather all Tiles, and fetch the Bag ids on
 * those tiles, but we do not fetch the contents of all those bags. The
 * SelectedTile/SelectedSeeker/etc states hold more detailed information.
 *
 */
export function makeWorld(cog: Source<CogServices>) {
    return pipe(
        cog,
        switchMap(({ query, gameID }) => {
            return pipe(query(GetWorldDocument, { gameID }), map(normalizeWorldState));
        }),
        debounce(() => 250),
    );
}

function normalizeWorldState({ game }: GetWorldQuery): WorldStateFragment {
    return {
        ...game.state,
        tiles: addUnscoutedTiles(game.state.tiles || []),
    } satisfies WorldStateFragment;
}

/**
 * generate the "tiles around the edge" of the current scouted area.
 * takes the current list of scouted tiles as input and returns a new list of
 * both scouted+unscouted tiles
 *
 * we need these tiles to exist in the data (even tho thhey are unscouted)
 * so we can have a consistent experience of selecting and processing these tiles
 *
 */
function addUnscoutedTiles(tiles: WorldTileFragment[]): WorldTileFragment[] {
    const unscouted = new Map<string, WorldTileFragment>();
    tiles.forEach((t) => {
        getUnscoutedNeighbours(tiles, t).forEach((unscoutedTile) => {
            if (!unscouted.has(unscoutedTile.id)) {
                unscouted.set(unscoutedTile.id, unscoutedTile);
            }
        });
    });
    return [...tiles, ...unscouted.values()];
}

function getUnscoutedTile(tiles: WorldTileFragment[], q: number, r: number, s: number): WorldTileFragment | null {
    const coords = [0, q, r, s].map((n) => ethers.toBeHex(ethers.toTwos(n, 16)));
    const id = CompoundKeyEncoder.encodeInt16(NodeSelectors.Tile, 0, q, r, s);
    const t = tiles.find((t) => t.id === id);
    if (t) {
        return null;
    }
    return {
        id,
        coords,
        bagCount: 0,
        bagBalances: [],
        biome: BiomeKind.UNDISCOVERED,
        seekers: [],
    };
}

function getUnscoutedNeighbours(tiles: WorldTileFragment[], t: WorldTileFragment) {
    const { q, r, s } = getCoords(t);
    return [
        getUnscoutedTile(tiles, q + 1, r, s - 1),
        getUnscoutedTile(tiles, q + 1, r - 1, s),
        getUnscoutedTile(tiles, q, r - 1, s + 1),
        getUnscoutedTile(tiles, q - 1, r, s + 1),
        getUnscoutedTile(tiles, q - 1, r + 1, s),
        getUnscoutedTile(tiles, q, r + 1, s - 1),
    ].filter((t): t is WorldTileFragment => !!t);
}

export function getCoords({ coords }) {
    return {
        q: Number(ethers.fromTwos(coords[1], 16)),
        r: Number(ethers.fromTwos(coords[2], 16)),
        s: Number(ethers.fromTwos(coords[3], 16)),
    };
}

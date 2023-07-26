// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {ABDKMath64x64 as Math} from "abdk-libraries-solidity/ABDKMath64x64.sol";

import {State} from "cog/State.sol";
import {Context, Rule} from "cog/Dispatcher.sol";

import {Schema, Node, BiomeKind, DEFAULT_ZONE, GOO_GREEN, GOO_BLUE, GOO_RED} from "@ds/schema/Schema.sol";
import {TileUtils} from "@ds/utils/TileUtils.sol";
import {ItemUtils} from "@ds/utils/ItemUtils.sol";
import {Perlin} from "@ds/utils/Perlin.sol";
import {Actions} from "@ds/actions/Actions.sol";

using Schema for State;

contract ScoutRule is Rule {
    function reduce(State state, bytes calldata action, Context calldata ctx) public returns (State) {
        if (bytes4(action) == Actions.SCOUT_MOBILE_UNIT.selector) {
            // decode the action
            (uint32 sid, int16[3] memory coords) = abi.decode(action[4:], (uint32, int16[3]));

            // encode the full mobileUnit node id
            bytes24 mobileUnit = Node.MobileUnit(sid);

            // check that sender owns mobileUnit
            if (state.getOwner(mobileUnit) != Node.Player(ctx.sender)) {
                revert("NoScoutNotOwner");
            }

            // encode destination tile
            bytes24 targetTile = Node.Tile(DEFAULT_ZONE, coords[0], coords[1], coords[2]);

            // fail if already discovered
            if (state.getBiome(targetTile) == BiomeKind.DISCOVERED) {
                revert("NoScoutAlreadyDiscovered");
            }

            // fetch the mobileUnit's current location
            (bytes24 mobileUnitTile) = state.getCurrentLocation(mobileUnit, ctx.clock);

            // check that target is adjacent to mobileUnit
            if (TileUtils.distance(mobileUnitTile, targetTile) != 1) {
                revert("NoScoutUnadjacent");
            }

            // do the reveal
            state.setBiome(targetTile, BiomeKind.DISCOVERED);

            _generateAtomValues(state, targetTile, coords);

            // randomly spawn a bag with some base items in it
            _tempSpawnResourceBag(state, targetTile, coords);
        }

        if (bytes4(action) == Actions.DEV_SPAWN_TILE.selector) {
            // decode action
            ( /*BiomeKind kind*/ , int16 q, int16 r, int16 s) = abi.decode(action[4:], (BiomeKind, int16, int16, int16));
            bytes24 targetTile = Node.Tile(DEFAULT_ZONE, q, r, s);
            _generateAtomValues(state, targetTile, [q, r, s]);
        }

        return state;
    }

    uint256 private _resourceSpawnCount = 0;

    int16 private constant GOO_GREEN_OFFSET_X = 0;
    int16 private constant GOO_GREEN_OFFSET_Y = 0;
    int16 private constant GOO_BLUE_OFFSET_X = 26; // 0.33 * 80
    int16 private constant GOO_BLUE_OFFSET_Y = 10; // 0.33 * 30
    int16 private constant GOO_RED_OFFSET_X = 53; // 0.66 * 80
    int16 private constant GOO_RED_OFFSET_Y = 20; // 0.66 * 30
    int16 private constant GOO_SCALE = 5;

    function _generateAtomValues(State state, bytes24 targetTile, int16[3] memory coords) private {
        uint64[3] memory atoms;

        // -- Using 2d Coords
        int16[2] memory coords2d = _cubeToGrid(coords);

        // function noise2d(int256 _x, int256 _y, int256 denomX, int256 denomY, uint8 precision) internal pure returns (int128)

        atoms[GOO_GREEN] = uint64(
            uint128(
                Perlin.noise2d(
                    (coords2d[0] + GOO_GREEN_OFFSET_X) * GOO_SCALE,
                    (coords2d[1] + GOO_GREEN_OFFSET_Y) * GOO_SCALE,
                    80,
                    30,
                    8
                )
            )
        );
        atoms[GOO_BLUE] = uint64(
            uint128(
                Perlin.noise2d(
                    (coords2d[0] + GOO_BLUE_OFFSET_X) * GOO_SCALE,
                    (coords2d[1] + GOO_BLUE_OFFSET_Y) * GOO_SCALE,
                    80,
                    30,
                    8
                )
            )
        );
        atoms[GOO_RED] = uint64(
            uint128(
                Perlin.noise2d(
                    (coords2d[0] + GOO_RED_OFFSET_X) * GOO_SCALE,
                    (coords2d[1] + GOO_RED_OFFSET_Y) * GOO_SCALE,
                    80,
                    30,
                    8
                )
            )
        );

        state.setTileAtomValues(targetTile, atoms);
    }

    function _cubeToGrid(int16[3] memory coords) private pure returns (int16[2] memory coords2d) {
        coords2d[0] = coords[0] + (coords[1] - (coords[1] & 1)) / 2;
        coords2d[1] = coords[1];
    }

    function _tempSpawnResourceBag(State state, bytes24 targetTile, int16[3] memory coords) private {
        uint64 bagID = uint64(uint256(keccak256(abi.encode(coords))));
        uint8 itemSlot = 0;
        if (uint8(bagID) < 128) {
            bytes24 bag = Node.Bag(bagID);
            state.setItemSlot(bag, itemSlot, _tempRandomResource(), 100);

            if (uint8(bagID >> 8) < 128) {
                itemSlot++;
                state.setItemSlot(bag, itemSlot, _tempRandomResource(), 100);
            }

            if (uint8(bagID >> 16) < 64) {
                itemSlot++;
                state.setItemSlot(bag, itemSlot, _tempRandomResource(), 100);
            }

            state.setEquipSlot(targetTile, 0, bag);
        }
    }

    function _tempRandomResource() private returns (bytes24) {
        _resourceSpawnCount++;
        uint256 n = _resourceSpawnCount % 3;
        if (n == 0) {
            return ItemUtils.GlassGreenGoo();
        } else if (n == 1) {
            return ItemUtils.BeakerBlueGoo();
        } else {
            return ItemUtils.FlaskRedGoo();
        }
    }
}

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {State} from "cog/State.sol";
import {Context, Rule} from "cog/Dispatcher.sol";
import {Context, Rule} from "cog/Dispatcher.sol";

import {Schema, Node, BiomeKind, DEFAULT_ZONE} from "@ds/schema/Schema.sol";
import {TileUtils} from "@ds/utils/TileUtils.sol";
import {ItemUtils} from "@ds/utils/ItemUtils.sol";
import {Actions} from "@ds/actions/Actions.sol";

using Schema for State;

contract ScoutRule is Rule {
    function reduce(State state, bytes calldata action, Context calldata ctx) public returns (State) {
        if (bytes4(action) == Actions.SCOUT_SEEKER.selector) {
            // decode the action
            (uint32 sid, int16[3] memory coords) = abi.decode(action[4:], (uint32, int16[3]));

            // encode the full seeker node id
            bytes24 seeker = Node.Seeker(sid);

            // check that sender owns seeker
            if (state.getOwner(seeker) != Node.Player(ctx.sender)) {
                revert("NoScoutNotOwner");
            }

            // encode destination tile
            bytes24 targetTile = Node.Tile(DEFAULT_ZONE, coords[0], coords[1], coords[2]);

            // fail if already discovered
            if (state.getBiome(targetTile) == BiomeKind.DISCOVERED) {
                revert("NoScoutAlreadyDiscovered");
            }

            // fetch the seeker's current location
            (bytes24 seekerTile) = state.getCurrentLocation(seeker, ctx.clock);

            // check that target is adjacent to seeker
            if (TileUtils.distance(seekerTile, targetTile) != 1) {
                revert("NoScoutUnadjacent");
            }

            // do the reveal
            state.setBiome(targetTile, BiomeKind.DISCOVERED);

            // randomly spawn a bag with some base items in it
            _tempSpawnResourceBag(state, targetTile, coords);
        }

        return state;
    }

    uint8 private _resourceSpawnCount = 0; // Used with modulo for round robin spawning of resouces

    function _tempSpawnResourceBag(State state, bytes24 targetTile, int16[3] memory coords) private {
        uint64 bagID = uint64(uint256(keccak256(abi.encode(coords))));
        if (uint8(bagID) < 128) {
            bytes24 bag = Node.Bag(bagID);

            state.setItemSlot(bag, 0, _tempRandomResource(), 100);
            state.setEquipSlot(targetTile, 0, bag);
        }
    }

    function _tempRandomResource() private returns (bytes24) {
        _resourceSpawnCount++;
        uint8 n = _resourceSpawnCount % 3;
        if (n == 0) {
            return ItemUtils.Kiki();
        } else if (n == 1) {
            return ItemUtils.Bouba();
        } else {
            return ItemUtils.Semiote();
        }
    }
}

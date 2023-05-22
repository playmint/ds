// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {State} from "cog/State.sol";
import {Context, Rule} from "cog/Dispatcher.sol";

import {Schema, Node, BiomeKind, TRAVEL_SPEED, DEFAULT_ZONE} from "@ds/schema/Schema.sol";
import {TileUtils} from "@ds/utils/TileUtils.sol";
import {Actions} from "@ds/actions/Actions.sol";

using Schema for State;

error NoMoveToUndiscovered();
error NoMoveToIndirect();
error NoMoveNotOwner();

contract MovementRule is Rule {
    function reduce(State state, bytes calldata action, Context calldata ctx) public returns (State) {
        if (bytes4(action) == Actions.MOVE_SEEKER.selector) {
            // decode the action
            (uint32 sid, int16 q, int16 r, int16 s) = abi.decode(action[4:], (uint32, int16, int16, int16));

            // encode the full seeker node id
            bytes24 seeker = Node.Seeker(sid);

            // check that sender owns seeker
            if (state.getOwner(seeker) != Node.Player(ctx.sender)) {
                revert NoMoveNotOwner();
            }

            // encode destination tile
            bytes24 destTile = Node.Tile(DEFAULT_ZONE, q, r, s);

            // check that the destination tile has been discovered
            if (state.getBiome(destTile) == BiomeKind.UNDISCOVERED) {
                revert NoMoveToUndiscovered();
            }

            // move
            moveTo(state, seeker, destTile, ctx.clock);
        }

        return state;
    }

    function moveTo(State state, bytes24 seeker, bytes24 destTile, uint64 nowTime) private {
        // fetch the seeker's current location
        (bytes24 currentTile) = state.getCurrentLocation(seeker, nowTime);

        // check that destTile is direct 6-axis line from currentTile
        if (!TileUtils.isDirect(currentTile, destTile)) {
            revert NoMoveToIndirect();
        }

        // if jumping over an undiscovered hole in the map, prevent moving
        // TODO: this is an artifact of allowing moving over undiscovered gaps
        //       which we likely do not want. so we can remove this if that kind
        //       of move is disallowed
        if (state.getBiome(currentTile) != BiomeKind.DISCOVERED) {
            revert NoMoveToUndiscovered();
        }

        // set prev location to current location
        state.setPrevLocation(seeker, currentTile, nowTime);

        // calc distance to next tile
        // x10 so we can move at speeds slower than 1TilePerBlock
        uint256 distance = TileUtils.distance(currentTile, destTile) * 10;
        if (distance == 0) {
            return;
        }

        // work out travel time
        uint64 travelTime = uint64(uint16(distance) / uint64(uint16(TRAVEL_SPEED)));
        if (travelTime == 0) {
            travelTime = 1;
        }

        // set destination and calc arrival
        state.setNextLocation(seeker, destTile, nowTime + travelTime);
    }
}

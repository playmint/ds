// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {State} from "cog/State.sol";
import {Context, Rule} from "cog/Dispatcher.sol";

import {Schema, Node, BiomeKind, TRAVEL_SPEED, DEFAULT_ZONE} from "@ds/schema/Schema.sol";
import {TileUtils} from "@ds/utils/TileUtils.sol";
import {Actions} from "@ds/actions/Actions.sol";

using Schema for State;

contract MovementRule is Rule {
    function reduce(State state, bytes calldata action, Context calldata ctx) public returns (State) {
        if (bytes4(action) == Actions.MOVE_MOBILE_UNIT.selector) {
            // decode the action
            (uint32 sid, int16 q, int16 r, int16 s) = abi.decode(action[4:], (uint32, int16, int16, int16));

            // encode the full mobileUnit node id
            bytes24 mobileUnit = Node.MobileUnit(sid);

            // check that sender owns mobileUnit
            require(state.getOwner(mobileUnit) == Node.Player(ctx.sender), "NoMoveNotOwner");

            // encode destination tile
            bytes24 destTile = Node.Tile(DEFAULT_ZONE, q, r, s);

            // check that the destination tile has been discovered
            require(state.getBiome(destTile) != BiomeKind.UNDISCOVERED, "NoMoveToUndiscovered");

            // move
            moveTo(state, mobileUnit, destTile, ctx.clock);
        }

        return state;
    }

    function moveTo(State state, bytes24 mobileUnit, bytes24 destTile, uint64 nowTime) private {
        // fetch the mobileUnit's current location
        (bytes24 currentTile) = state.getCurrentLocation(mobileUnit, nowTime);

        // TODO: if currentTile doesn't equal tile at LocationKey.NEXT then movement was cancelled.
        //       dispatch MOVE_CANCEL action here so any systems that were tracking mvoement know about it

        // check that destTile is direct 6-axis line from currentTile
        require(TileUtils.isDirect(currentTile, destTile), "NoMoveToIndirect");

        // if jumping over an undiscovered hole in the map, prevent moving
        // TODO: this is an artifact of allowing moving over undiscovered gaps
        //       which we likely do not want. so we can remove this if that kind
        //       of move is disallowed
        require(state.getBiome(currentTile) == BiomeKind.DISCOVERED, "NoMoveToUndiscovered");

        // set prev location to current location
        state.setPrevLocation(mobileUnit, currentTile, nowTime);

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
        state.setNextLocation(mobileUnit, destTile, nowTime + travelTime);
    }
}

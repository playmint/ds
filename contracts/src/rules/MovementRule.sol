// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "cog/IState.sol";
import "cog/IRule.sol";
import "cog/IDispatcher.sol";

import {Schema, Node, BiomeKind, TRAVEL_SPEED, DEFAULT_ZONE, Rel} from "@ds/schema/Schema.sol";
import {TileUtils} from "@ds/utils/TileUtils.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {ItemUtils} from "@ds/utils/ItemUtils.sol";

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
        //
        // fetch the mobileUnit's current location
        (bytes24 currentTile) = state.getCurrentLocation(mobileUnit, nowTime);
        // check that destTile is direct 6-axis line from currentTile
        // require(TileUtils.isDirect(currentTile, destTile), "NoMoveToIndirect");
        // require(state.getBiome(currentTile) == BiomeKind.DISCOVERED, "NoMoveToUndiscovered");
        // state.setPrevLocation(mobileUnit, currentTile, nowTime);
        // calc distance to next tile
        // x10 so we can move at speeds slower than 1TilePerBlock
        // uint256 distance = TileUtils.distance(currentTile, destTile) * 10;
        // if (distance == 0) {
        //     return;
        // }
        // work out travel time
        // uint64 travelTime = uint64(uint16(distance) / uint64(uint16(TRAVEL_SPEED)));
        // if (travelTime == 0) {
        //     travelTime = 1;
        // }

        // [!] various changes to the game mean that movement as initially
        //     implemented does not work blockers, long paths, faster simulation,
        //     etc we are temporarily letting you basically teleport anywhere ...
        //     and only the client is restricting movement until we have the
        //     process nailed more
        state.setNextLocation(mobileUnit, destTile, nowTime);
        state.setPrevLocation(mobileUnit, currentTile, nowTime);

        (bytes24 bag) = state.getEquipSlot(mobileUnit, 2);

        // Decrement goo
        for (uint8 i = 0; i < 4; i++) {
            (bytes24 item, uint64 balance) = state.getItemSlot(bag, i);
            if (
                balance > 0
                    && (item == ItemUtils.GreenGoo() || item == ItemUtils.BlueGoo() || item == ItemUtils.RedGoo())
            ) {
                state.setItemSlot(bag, i, item, balance - 1);
                break;
            }
        }

        // Check if any goo left
        uint256 total;
        for (uint8 i = 0; i < 4; i++) {
            (bytes24 item, uint64 balance) = state.getItemSlot(bag, i);
            if (
                balance > 0
                    && (item == ItemUtils.GreenGoo() || item == ItemUtils.BlueGoo() || item == ItemUtils.RedGoo())
            ) {
                total++;
            }
        }

        // If zero then drop bags if they contain any items
        if (total == 0) {
            state.killMobileUnit(mobileUnit);
        }
    }
}

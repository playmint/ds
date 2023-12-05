// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "cog/IState.sol";
import "cog/IRule.sol";
import "cog/IDispatcher.sol";

import {Schema, Node, DEFAULT_ZONE} from "@ds/schema/Schema.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {ItemUtils} from "@ds/utils/ItemUtils.sol";

using Schema for State;

contract CritterRule is Rule {

    function reduce(State state, bytes calldata action, Context calldata ctx) public returns (State) {
        // spawn a critter for any player at any location
        if (bytes4(action) == Actions.SPAWN_CRITTER.selector) {
            (bytes24 id) = abi.decode(action[4:], (bytes24));
            _spawn(state, ctx, id);
        } else if (bytes4(action) == Actions.MOVE_CRITTER.selector) {
            (bytes24 id, int16 q, int16 r, int16 s) = abi.decode(action[4:], (bytes24, int16, int16, int16));
            _move(state, ctx, id, q, r, s);
        }

        return state;
    }

    function _spawn(State state, Context calldata ctx, bytes24 id) internal {
        // set location
        bytes24 locationTile = Node.Tile(DEFAULT_ZONE, 0, 0, 0);
        state.setPrevLocation(id, locationTile, 0);
        state.setNextLocation(id, locationTile, ctx.clock);

        // give the critter a bag with green goo to represent health
        bytes24 bag100 = _equipBag(state, id, ctx.sender, 100);
        state.setItemSlot(bag100, 0, ItemUtils.GreenGoo(), 100);
    }

    function _move(State state, Context calldata ctx, bytes24 id, int16 q, int16 r, int16 s) internal {
        bytes24 destTile = Node.Tile(DEFAULT_ZONE, q, r, s);
        (bytes24 currentTile) = state.getCurrentLocation(id, ctx.clock);
        state.setNextLocation(id, destTile, ctx.clock);
        state.setPrevLocation(id, currentTile, ctx.clock);
    }

    function _equipBag(State state, bytes24 id, address owner, uint8 equipSlot) private returns (bytes24) {
        bytes24 bag = Node.Bag(uint64(uint256(keccak256(abi.encode(id, equipSlot)))));
        state.setOwner(bag, Node.Player(owner));
        state.setEquipSlot(id, equipSlot, bag);
        return bag;
    }

}

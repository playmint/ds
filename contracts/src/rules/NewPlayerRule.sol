// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "cog/IState.sol";
import "cog/IRule.sol";
import "cog/IDispatcher.sol";

import {Schema, Node, QuestStatus} from "@ds/schema/Schema.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {ItemUtils} from "@ds/utils/ItemUtils.sol";

using Schema for State;

contract NewPlayerRule is Rule {
    function reduce(State state, bytes calldata action, Context calldata ctx) public returns (State) {
        // spawn a mobileUnit for any player at any location
        if (bytes4(action) == Actions.SPAWN_MOBILE_UNIT.selector) {
            // decode action
            bytes24 mobileUnit = Node.MobileUnit(ctx.sender);
            if (state.getOwner(mobileUnit) != 0) {
                return state;
            }
            // set the mobileUnit's owner
            state.setOwner(mobileUnit, Node.Player(ctx.sender));
            // set location to limbo zone
            bytes24 locationTile = Node.Tile(0, 0, 0, 0);
            state.setPrevLocation(mobileUnit, locationTile, 0);
            state.setNextLocation(mobileUnit, locationTile, ctx.clock);
            // give the mobileUnit a couple of bags
            _spawnBag(state, mobileUnit, ctx.sender, 0);
            bytes24 bag1 = _spawnBag(state, mobileUnit, ctx.sender, 1);

            //give the mobileUnit 100 of each of the base materials
            state.setItemSlot(bag1, 0, ItemUtils.GreenGoo(), 100);
            state.setItemSlot(bag1, 1, ItemUtils.BlueGoo(), 100);
            state.setItemSlot(bag1, 2, ItemUtils.RedGoo(), 100);
        }

        return state;
    }

    function _spawnBag(State state, bytes24 mobileUnit, address owner, uint8 equipSlot) private returns (bytes24) {
        bytes24 bag = Node.Bag(uint64(uint256(keccak256(abi.encode(mobileUnit, equipSlot)))));
        state.setOwner(bag, Node.Player(owner));
        state.setEquipSlot(mobileUnit, equipSlot, bag);
        return bag;
    }
}

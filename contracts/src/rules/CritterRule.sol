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
            (bytes24 id, uint64 radius) = abi.decode(action[4:], (bytes24, uint64));
            _spawn(state, ctx, id, radius);
        } else if (bytes4(action) == Actions.MOVE_CRITTER.selector) {
            (bytes24 id, int16 q, int16 r, int16 s) = abi.decode(action[4:], (bytes24, int16, int16, int16));
            _move(state, ctx, id, q, r, s);
        } else if (bytes4(action) == Actions.ATTACK.selector) {
            (bytes24 attacker, bytes24 attacked, uint64 weight) = abi.decode(action[4:], (bytes24, bytes24, uint64));
            _attack(state, ctx, attacker, attacked, weight);
        }

        return state;
    }

    function _spawn(State state, Context calldata ctx, bytes24 id, uint64 radius) internal {
        // set location
        bytes24 locationTile = Node.Tile(DEFAULT_ZONE, 0, 0, 0);
        state.setPrevLocation(id, locationTile, 0);
        state.setNextLocation(id, locationTile, ctx.clock);

        // give the critter a bag with green goo to represent health
        bytes24 healthBag = _equipBag(state, id, ctx.sender, 100);
        state.setItemSlot(healthBag, 0, ItemUtils.GreenGoo(), 100);

        // give critter some red goo to represent radius
        state.setItemSlot(healthBag, 1, ItemUtils.RedGoo(), radius);
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

    function _attack(State state, Context calldata ctx, bytes24 attacker, bytes24 attacked, uint64 weight) internal {
        bytes24 healthBag = state.getEquipSlot(attacked, 100);
        (bytes24 item, uint64 health) = state.getItemSlot(healthBag, 0);
        if (weight >= health) {
            health = 0;
        } else {
            health = health - weight;
        }
        state.setItemSlot(healthBag, 0, item, health);
        if (health == 0) {
            // TODO: atacked could be a critter too
            _destroyBuilding(state, attacked);
        }
    }

    function _destroyBuilding(State state, bytes24 buildingInstance) private {
        // set type of building
        state.setBuildingKind(buildingInstance, bytes24(0));
        // set building owner to player who created it
        state.setOwner(buildingInstance, bytes24(0));
        // set building location
        state.setFixedLocation(buildingInstance, bytes24(0));

        // TODO: Orphaned bags
        state.setEquipSlot(buildingInstance, 0, bytes24(0));
        state.setEquipSlot(buildingInstance, 1, bytes24(0));
    }

}

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {State} from "cog/State.sol";
import {Context, Rule} from "cog/Dispatcher.sol";
import {Context, Rule} from "cog/Dispatcher.sol";

import {Schema, Node, BiomeKind, ResourceKind, DEFAULT_ZONE} from "@ds/schema/Schema.sol";
import {Actions} from "@ds/actions/Actions.sol";

error SeekerIdAlreadyClaimed();

using Schema for State;

contract NewPlayerRule is Rule {
    function reduce(State state, bytes calldata action, Context calldata ctx) public returns (State) {
        // spawn a seeker for any player at any location
        if (bytes4(action) == Actions.SPAWN_SEEKER.selector) {
            // decode action
            (bytes24 seeker) = abi.decode(action[4:], (bytes24));
            // check seeker isn't already owned
            if (seeker == 0 || state.getOwner(seeker) != 0) {
                revert SeekerIdAlreadyClaimed();
            }
            // set the seeker's owner
            state.setOwner(seeker, Node.Player(ctx.sender));
            // set location
            bytes24 locationTile = Node.Tile(DEFAULT_ZONE, 0, 0, 0);
            state.setPrevLocation(seeker, locationTile, 0);
            state.setNextLocation(seeker, locationTile, ctx.clock);
            // give the seeker a couple of bags
            _spawnBag(state, seeker, ctx.sender, 0);
            _spawnBag(state, seeker, ctx.sender, 1);
        }

        return state;
    }

    function _spawnBag(State state, bytes24 seeker, address owner, uint8 equipSlot) private {
        bytes24 bag = Node.Bag(uint64(uint256(keccak256(abi.encode(seeker)))));
        state.setOwner(bag, Node.Player(owner));
        state.setEquipSlot(seeker, equipSlot, bag);
    }
}

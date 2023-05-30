// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {State} from "cog/State.sol";
import {Context, Rule} from "cog/Dispatcher.sol";
import {Context, Rule} from "cog/Dispatcher.sol";

import {Schema, Node, BiomeKind, DEFAULT_ZONE} from "@ds/schema/Schema.sol";
import {Actions} from "@ds/actions/Actions.sol";

using Schema for State;

// Cheats are only enabled for local dev builds to allow messing with the
// game state in ways that are usually illegal

contract CheatsRule is Rule {
    function reduce(State state, bytes calldata action, Context calldata /*ctx*/ ) public returns (State) {
        if (bytes4(action) == Actions.DEV_SPAWN_TILE.selector) {
            // decode action
            (BiomeKind kind, int16 q, int16 r, int16 s) = abi.decode(action[4:], (BiomeKind, int16, int16, int16));
            // discover the tile
            state.setBiome(Node.Tile(DEFAULT_ZONE, q, r, s), kind);
        } else if (bytes4(action) == Actions.DEV_SPAWN_BAG.selector) {
            (
                uint64 bagID,
                address owner,
                bytes24 equipee,
                uint8 equipSlot,
                bytes24[] memory slotContents,
                uint64[] memory slotBalances
            ) = abi.decode(action[4:], (uint64, address, bytes24, uint8, bytes24[], uint64[]));
            _spawnBag(state, bagID, owner, equipee, equipSlot, slotContents, slotBalances);
        }

        return state;
    }

    function _spawnBag(
        State state,
        uint64 bagID,
        address owner,
        bytes24 equipee,
        uint8 equipSlot,
        bytes24[] memory slotContents,
        uint64[] memory slotBalances
    ) private {
        bytes24 bag = Node.Bag(bagID);
        for (uint8 i = 0; i < slotContents.length; i++) {
            state.setItemSlot(bag, i, slotContents[i], slotBalances[i]);
        }
        state.setOwner(bag, Node.Player(owner));
        state.setEquipSlot(equipee, equipSlot, bag);
    }

    function _spawnBag2(State state, bytes24 seeker, address owner, uint8 equipSlot) private {
        bytes24 bag = Node.Bag(uint64(uint256(keccak256(abi.encode(seeker)))));
        state.setOwner(bag, Node.Player(owner));
        state.setEquipSlot(seeker, equipSlot, bag);
    }
}

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "cog/IState.sol";
import "cog/IRule.sol";
import "cog/IDispatcher.sol";

import {Schema, Node, Kind, Rel, DEFAULT_ZONE} from "@ds/schema/Schema.sol";
import {Actions} from "@ds/actions/Actions.sol";

import "forge-std/console.sol";

using Schema for State;

// interface TaskKind {
//     function coord(int16 q, int16 r, int16 s) external;
//     function inventory(bytes24 item, uint64 quantity) external;
// }

contract QuestRule is Rule {
    constructor() {}

    function reduce(State state, bytes calldata action, Context calldata ctx) public returns (State) {
        // REGISTER_TASK(bytes24 task, string calldata name, bytes calldata taskData) external;
        if (bytes4(action) == Actions.REGISTER_TASK.selector) {
            (bytes24 task, string memory name, bytes memory taskData) = abi.decode(action[4:], (bytes24, string, bytes));

            // TODO: Check for owner

            // Store the task data
            uint32 taskKind = state.getTaskKind(task);
            if (uint32(uint256(keccak256(abi.encodePacked("coord")))) == taskKind) {
                (int16 q, int16 r, int16 s) = abi.decode(taskData, (int16, int16, int16));
                bytes24 tile = Node.Tile(DEFAULT_ZONE, q, r, s);
                state.set(Rel.Location.selector, 0, task, tile, 0);
            } else if (uint32(uint256(keccak256(abi.encodePacked("inventory")))) == taskKind) {
                (bytes24 item, uint64 quantity) = abi.decode(taskData, (bytes24, uint64));
                state.set(Rel.Balance.selector, 0, task, item, quantity);
            }

            _setName(state, Node.Player(ctx.sender), task, name);
        }

        if (bytes4(action) == Actions.REGISTER_QUEST.selector) {
            (
                bytes24 quest,
                string memory name,
                string memory description,
                bool hasLocation,
                int16 q,
                int16 r,
                int16 s,
                bytes24[] memory tasks
            ) = abi.decode(action[4:], (bytes24, string, string, bool, int16, int16, int16, bytes24[]));

            // TODO: Check for owner

            _setName(state, Node.Player(ctx.sender), quest, name);
            _setDescription(state, Node.Player(ctx.sender), quest, description);

            if (hasLocation) {
                bytes24 tile = Node.Tile(DEFAULT_ZONE, q, r, s);
                state.set(Rel.Location.selector, 0, quest, tile, 0);
            }

            // Link tasks
            for (uint8 i = 0; i < tasks.length; i++) {
                bytes24 task = tasks[i];
                state.set(Rel.HasTask.selector, i, quest, task, 0);
            }
        }
        return state;
    }

    function _setName(State state, bytes24 player, bytes24 entity, string memory name) private {
        bytes24 existingOwner = state.getOwner(entity);
        if (existingOwner != 0x0 && existingOwner != player) {
            revert("EntityNotOwnedByPlayer");
        }
        state.annotate(entity, "name", name);
    }

    function _setDescription(State state, bytes24 player, bytes24 entity, string memory name) private {
        bytes24 existingOwner = state.getOwner(entity);
        if (existingOwner != 0x0 && existingOwner != player) {
            revert("EntityNotOwnedByPlayer");
        }
        state.annotate(entity, "description", name);
    }
}

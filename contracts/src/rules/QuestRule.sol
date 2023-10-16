// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "cog/IState.sol";
import "cog/IRule.sol";
import "cog/IDispatcher.sol";

import {Schema, Node, Kind, Rel, DEFAULT_ZONE, QuestStatus} from "@ds/schema/Schema.sol";
import {Actions} from "@ds/actions/Actions.sol";

import "forge-std/console.sol";

using Schema for State;

// interface TaskKind {
//     function coord(int16 q, int16 r, int16 s) external;
//     function inventory(bytes24 item, uint64 quantity) external;
// }

uint8 constant MAX_NEXT_QUESTS = 5;

contract QuestRule is Rule {
    constructor() {}

    function reduce(State state, bytes calldata action, Context calldata ctx) public returns (State) {
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
            } else if (uint32(uint256(keccak256(abi.encodePacked("message")))) == taskKind) {
                (bytes24 buildingKind, string memory message) = abi.decode(taskData, (bytes24, string));
                state.set(Rel.Has.selector, 0, task, buildingKind, 0);
                state.annotate(task, "message", message);
            } else if (
                uint32(uint256(keccak256(abi.encodePacked("questAccept")))) == taskKind
                    || uint32(uint256(keccak256(abi.encodePacked("questComplete")))) == taskKind
            ) {
                (bytes24 quest) = abi.decode(taskData, (bytes24));
                state.set(Rel.HasQuest.selector, 0, task, quest, 0);
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
                bytes24[] memory tasks,
                bytes24[] memory nextQuests
            ) = abi.decode(action[4:], (bytes24, string, string, bool, int16, int16, int16, bytes24[], bytes24[]));

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
                require(bytes4(task) == Kind.Task.selector, "Linked task must be a task node");
                state.set(Rel.HasTask.selector, i, quest, task, 0);
            }

            // Point to next quests
            for (uint8 i = 0; i < nextQuests.length; i++) {
                bytes24 nextQuest = nextQuests[i];
                require(bytes4(nextQuest) == Kind.Quest.selector, "Linked quest must be a quest node");
                state.set(Rel.HasQuest.selector, i, quest, nextQuest, 0);
            }
        }

        if (bytes4(action) == Actions.ACCEPT_QUEST.selector) {
            (bytes24 quest, uint8 questNum) = abi.decode(action[4:], (bytes24, uint8));

            ( /*bytes24 currentQuest*/ , QuestStatus questStatus) =
                state.getPlayerQuest(Node.Player(ctx.sender), questNum);
            require(questStatus == QuestStatus.NONE, "Quest already present at given questNum");

            state.setQuestAccepted(quest, Node.Player(ctx.sender), questNum);
        }

        if (bytes4(action) == Actions.COMPLETE_QUEST.selector) {
            (bytes24 quest, uint8 questNum) = abi.decode(action[4:], (bytes24, uint8));

            // Check the quest at questNum matches supplied quest. Maybe we only need to supply questNum seeing as we have to fetch it
            {
                (bytes24 currentQuest, QuestStatus questStatus) =
                    state.getPlayerQuest(Node.Player(ctx.sender), questNum);

                require(quest == currentQuest, "Quest at given questNum doesn't match supplied quest ID");
                require(questStatus == QuestStatus.ACCEPTED, "Quest must be in ACCEPTED state to be completed");
            }

            // TODO: Do evalutation of task completion

            state.setQuestCompleted(quest, Node.Player(ctx.sender), questNum);

            // Auto accept next quests

            bytes24 questAtSlot = quest;
            for (uint8 i = 0; i < MAX_NEXT_QUESTS; i++) {
                (bytes24 nextQuest, /*uint8 weight*/ ) = state.get(Rel.HasQuest.selector, i, quest);
                if (nextQuest == bytes24(0)) {
                    continue;
                }

                // Find next available questNum (questSlot?)
                while (questAtSlot != bytes24(0)) {
                    // TODO: Quests are linked to a player via edges which means there is a hard limit of 256 quests
                    require(questNum < 255, "Reached maximum number of quests the player can have record of");
                    questNum++;
                    (questAtSlot, /*questStatus*/ ) = state.getPlayerQuest(Node.Player(ctx.sender), questNum);
                }

                state.setQuestAccepted(nextQuest, Node.Player(ctx.sender), questNum);
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

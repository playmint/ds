// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "cog/IState.sol";
import "cog/IRule.sol";
import "cog/IDispatcher.sol";

import {Schema, Kind, Node, Rel, TaskKind, QuestStatus, LIFE, DEFENCE, ATTACK} from "@ds/schema/Schema.sol";
import {Actions} from "@ds/actions/Actions.sol";

import "forge-std/console.sol";

using Schema for State;

uint8 constant MAX_NEXT_QUESTS = 5;

/**
 * Known problems:
 * - It's possible to accept a quest twice by manually accepting a quest at a high questNum (edge) and
 *     then accepting it again at a lower number. This is because we only check up to the supplied quest
 *     number instead of checking all 256 slots
 * - The player can only ever complete 256 quests. We don't have any mechanism of tidying up completed quests
 */
contract QuestRule is Rule {
    constructor() {}

    function reduce(State state, bytes calldata action, Context calldata ctx) public returns (State) {
        if (bytes4(action) == Actions.REGISTER_TASK.selector) {
            _registerTask(state, action, ctx.sender);
        }

        if (bytes4(action) == Actions.REGISTER_QUEST.selector) {
            _registerQuest(state, action, ctx.sender);
        }

        if (bytes4(action) == Actions.ACCEPT_QUEST.selector) {
            _acceptQuest(state, action, ctx.sender);
        }

        if (bytes4(action) == Actions.COMPLETE_QUEST.selector) {
            _completeQuest(state, action, ctx.sender);
        }

        return state;
    }

    function _registerTask(State state, bytes calldata action, address sender) private {
        (int16 zone, string memory name, TaskKind taskKind, bytes memory taskData) =
            abi.decode(action[4:], (int16, string, TaskKind, bytes));

        // sender claims id
        bytes24 task = Node.Task(zone, name, taskKind);
        _claimEntity(state, task, sender);

        // Store the task data
        if (TaskKind.COORD == taskKind) {
            (int16 z, int16 q, int16 r, int16 s) = abi.decode(taskData, (int16, int16, int16, int16));
            bytes24 tile = Node.Tile(z, q, r, s);
            state.set(Rel.Location.selector, 0, task, tile, 0);
        } else if (TaskKind.INVENTORY == taskKind) {
            (bytes24 item, uint64 quantity) = abi.decode(taskData, (bytes24, uint64));
            require(bytes4(item) == Kind.Item.selector, "inventoryTask: item ID not Item node");
            state.set(Rel.Balance.selector, 0, task, item, quantity);
        } else if (TaskKind.MESSAGE == taskKind) {
            (bytes24 buildingKind, string memory message) = abi.decode(taskData, (bytes24, string));
            require(
                bytes4(buildingKind) == Kind.BuildingKind.selector, "messageTask: buildingKind ID not BuildingKind node"
            );
            state.set(Rel.Has.selector, 0, task, buildingKind, 0);
            state.annotate(task, "message", message);
        } else if (TaskKind.QUEST_ACCEPT == taskKind || TaskKind.QUEST_COMPLETE == taskKind) {
            (bytes24 quest) = abi.decode(taskData, (bytes24));
            require(bytes4(quest) == Kind.Quest.selector, "questAccept/questComplete: quest ID not Quest node");
            state.set(Rel.HasQuest.selector, 0, task, quest, 0);
        } else if (TaskKind.COMBAT == taskKind) {
            (uint8 combatState) = abi.decode(taskData, (uint8));
            // HACK: Storing arbitrary data by setting an edge to itself
            state.set(Rel.Has.selector, 0, task, task, combatState);
        } else if (TaskKind.CONSTRUCT == taskKind) {
            // Building kind is optional
            (bytes24 buildingKind) = abi.decode(taskData, (bytes24));
            if (buildingKind != bytes24(0)) {
                require(
                    bytes4(buildingKind) == Kind.BuildingKind.selector,
                    "constructTask: buildingKind ID not BuildingKind node"
                );
                state.set(Rel.Has.selector, 0, task, buildingKind, 0);
            }
        } else if (TaskKind.UNIT_STATS == taskKind) {
            (uint64 life, uint64 defence, uint64 attack) = abi.decode(taskData, (uint64, uint64, uint64));
            state.set(Rel.Balance.selector, LIFE, task, Node.Atom(LIFE), life);
            state.set(Rel.Balance.selector, DEFENCE, task, Node.Atom(DEFENCE), defence);
            state.set(Rel.Balance.selector, ATTACK, task, Node.Atom(ATTACK), attack);
        } else if (TaskKind.DEPLOY_BUILDING == taskKind) {
            (bytes24 craftInput, bytes24 craftOutput) = abi.decode(taskData, (bytes24, bytes24));
            if (craftInput != bytes24(0)) {
                state.set(Rel.Balance.selector, 0, task, craftInput, 0);
            }
            if (craftOutput != bytes24(0)) {
                state.set(Rel.Balance.selector, 1, task, craftOutput, 0);
            }
        }

        _setName(state, Node.Player(sender), task, name);
    }

    function _registerQuest(State state, bytes calldata action, address sender) private {
        (
            int16 zone,
            string memory name,
            string memory description,
            bool hasLocation,
            int16 z,
            int16 q,
            int16 r,
            int16 s,
            bytes24[] memory tasks,
            bytes24[] memory nextQuests
        ) = abi.decode(action[4:], (int16, string, string, bool, int16, int16, int16, int16, bytes24[], bytes24[]));

        // sender claims id
        bytes24 quest = Node.Quest(zone, name);
        _claimEntity(state, quest, sender);

        _setName(state, Node.Player(sender), quest, name);
        _setDescription(state, Node.Player(sender), quest, description);

        if (hasLocation) {
            bytes24 tile = Node.Tile(z, q, r, s);
            state.set(Rel.Location.selector, 0, quest, tile, 0);
        }

        // Link tasks
        for (uint8 i = 0; i < tasks.length; i++) {
            require(bytes4(tasks[i]) == Kind.Task.selector, "Linked task must be a task node");
            state.set(Rel.HasTask.selector, i, quest, tasks[i], 0);
        }

        // Point to next quests
        for (uint8 i = 0; i < nextQuests.length; i++) {
            require(bytes4(nextQuests[i]) == Kind.Quest.selector, "Linked quest must be a quest node");
            state.set(Rel.HasQuest.selector, i, quest, nextQuests[i], 0);
        }
    }

    function _acceptQuest(State state, bytes calldata action, address sender) private {
        (bytes24 quest, uint8 questNum) = abi.decode(action[4:], (bytes24, uint8));
        int16 zone = _getZone(quest);
        require(zone != 0x0, "Quest must be zoned");

        // Check that we haven't already accepted / completed the quest in the past
        // NOTE: We are making the assuption that supplied questNums are supplied from the frontend in sequence.
        //       To make this more secure (at a cost of gas) we could check all 256 slots
        for (uint8 i = 0; i < questNum; i++) {
            (bytes24 existingQuest, /*QuestStatus questStatus*/ ) = state.getZonedPlayerQuest(zone, sender, i);
            require(existingQuest != quest, "Quest already accepted/completed");
        }

        ( /*bytes24 currentQuest*/ , QuestStatus questStatus) = state.getZonedPlayerQuest(zone, sender, questNum);
        require(questStatus == QuestStatus.NONE, "Quest already present at given questNum");

        state.setZonedPlayerQuest(quest, zone, sender, questNum, QuestStatus.ACCEPTED);
    }

    function _completeQuest(State state, bytes calldata action, address sender) private {
        (bytes24 quest, uint8 questNum) = abi.decode(action[4:], (bytes24, uint8));
        int16 zone = _getZone(quest);
        require(zone != 0x0, "Quest must be zoned");

        // Check the quest at questNum matches supplied quest. Maybe we only need to supply questNum seeing as we have to fetch it
        {
            (bytes24 currentQuest, QuestStatus questStatus) = state.getZonedPlayerQuest(zone, sender, questNum);

            require(quest == currentQuest, "Quest at given questNum doesn't match supplied quest ID");
            require(questStatus == QuestStatus.ACCEPTED, "Quest must be in ACCEPTED state to be completed");
        }

        // TODO: Do evalutation of task completion

        state.setZonedPlayerQuest(quest, zone, sender, questNum, QuestStatus.COMPLETED);

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
                (questAtSlot, /*questStatus*/ ) = state.getZonedPlayerQuest(zone, sender, questNum);
            }

            zone = _getZone(nextQuest);
            require(zone != 0x0, "Quest must be zoned");
            state.setZonedPlayerQuest(nextQuest, zone, sender, questNum, QuestStatus.ACCEPTED);
        }
    }

    function _claimEntity(State state, bytes24 entity, address sender) private {
        bytes24 existingOwner = state.getOwner(entity);
        require(existingOwner == 0x0 || existingOwner == Node.Player(sender), "already registered");
        state.setOwner(entity, Node.Player(sender));
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

    function _getZone(bytes24 questOrTask) internal pure returns (int16) {
        return int16(uint16(uint160(uint192(questOrTask)) >> 128));
    }
}

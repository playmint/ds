// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "cog/IGame.sol";
import "cog/IState.sol";
import "cog/IRule.sol";

import {Schema, Node, Rel, Kind, DEFAULT_ZONE, BuildingCategory, BuildingBlockNumKey} from "@ds/schema/Schema.sol";
import {TileUtils} from "@ds/utils/TileUtils.sol";
import {ItemUtils} from "@ds/utils/ItemUtils.sol";
import {Actions, ArgType, TriggerType} from "@ds/actions/Actions.sol";
import {BuildingKind} from "@ds/ext/BuildingKind.sol";
import {CraftingRule} from "@ds/rules/CraftingRule.sol";
import {PartKind} from "@ds/ext/PartKind.sol";
import {LibString} from "cog/utils/LibString.sol";

using Schema for State;

uint8 constant MAX_TRIGGERS = 10;

struct StateListener {
    bytes24 partId;
    uint8 triggerIndex;
}

contract PartKindRule is Rule {
    Game game;

    mapping(bytes24 => mapping(uint8 => StateListener[])) listeners;

    constructor(Game g) {
        game = g;
    }

    function reduce(State state, bytes calldata action, Context calldata ctx) public returns (State) {
        if (bytes4(action) == Actions.REGISTER_PART_KIND.selector) {
            (bytes24 partKindId, string memory name, string memory model) =
                abi.decode(action[4:], (bytes24, string, string));

            _registerPartKind(state, partKindId, Node.Player(ctx.sender), name, model);
        }

        if (bytes4(action) == Actions.REGISTER_PART_ACTION.selector) {
            (
                bytes24 partKindId,
                uint8 actionIndex,
                string memory name,
                string[] memory argNames,
                uint8[] memory argTypes,
                bool[] memory argLists,
                uint256[] memory argLengths
            ) = abi.decode(action[4:], (bytes24, uint8, string, string[], uint8[], bool[], uint256[]));

            _registerPartAction(state, partKindId, actionIndex, name, argNames, argTypes, argLists, argLengths);
        }

        if (bytes4(action) == Actions.REGISTER_PART_REF.selector) {
            (bytes24 partKindId, uint8 index, string memory name, bytes24 refPartKindId, bool list, uint256 length) =
                abi.decode(action[4:], (bytes24, uint8, string, bytes24, bool, uint256));
            _registerPartRef(state, partKindId, index, name, refPartKindId, list, length);
        }

        if (bytes4(action) == Actions.REGISTER_PART_STATE.selector) {
            (bytes24 partKindId, uint8 index, string memory argName, uint8 argType, bool argList, uint256 argLength) =
                abi.decode(action[4:], (bytes24, uint8, string, uint8, bool, uint256));
            _registerPartState(state, partKindId, index, argName, argType, argList, argLength);
        }

        if (bytes4(action) == Actions.REGISTER_PART_ACTION_TRIGGER.selector) {
            ( bytes24 partKindId, uint8 triggerIndex, uint8 actionIndex) =
                abi.decode(action[4:], ( bytes24, uint8, uint8));
            _registerPartActionTrigger(state, partKindId, triggerIndex, actionIndex);
        }

        if (bytes4(action) == Actions.REGISTER_PART_STATE_TRIGGER.selector) {
            ( bytes24 partKindId, uint8 triggerIndex, bytes24 remotePartStateDefId) =
                abi.decode(action[4:], ( bytes24, uint8, bytes24));
            _registerPartStateTrigger(state, partKindId, triggerIndex, remotePartStateDefId);
        }

        if (bytes4(action) == Actions.CALL_ACTION_ON_PART.selector) {
            (bytes24 partId, bytes24 actionDefId, bytes memory payload) = abi.decode(action[4:], (bytes24, bytes24, bytes));
            bytes24 player = Node.Player(ctx.sender);
            _callPartAction(state, player, partId, actionDefId, payload);
        }

        if (bytes4(action) == Actions.SPAWN_PART.selector) {
            (bytes24 partKindId, int16 q, int16 r, int16 s) = abi.decode(action[4:], (bytes24, int16, int16, int16));
            _spawnPart(state, partKindId, q, r, s);
        }

        if (bytes4(action) == Actions.SET_STATE_VAR_ON_PART.selector) {
            (bytes24 partId, uint8 stateVariableIndex, uint8 stateVariableElmIndex, bytes32 val) = abi.decode(action[4:], (bytes24, uint8, uint8, bytes32));
            bytes24 player = Node.Player(ctx.sender);
            _setStateVar(state, player, partId, stateVariableIndex, stateVariableElmIndex, val);
        }

        if (bytes4(action) == Actions.SET_PART_VAR_ON_PART.selector) {
            (bytes24 partId, uint8 variableIndex, uint8 variableElmIndex, bytes24 remotePartId) = abi.decode(action[4:], (bytes24, uint8, uint8, bytes24));
            bytes24 player = Node.Player(ctx.sender);
            _setPartVar(state, player, partId, variableIndex, variableElmIndex, remotePartId);
        }


        return state;
    }

    function _callPartAction(State state, bytes24 sender, bytes24 partId, bytes24 actionDefId, bytes memory payload) private {
        bytes24 partKindId = state.getPartKind(partId);
        require(partKindId != 0x0, 'no kind, maybe invalid partId');

        PartKind partImplementation = PartKind(state.getImplementation(partKindId));

        // no-op if no part implmenetation registered
        if (address(partImplementation) == address(0)) {
            return;
        }

        // find all the actionDef that will get triggered by this call
        // THINK: max number of 10 triggers attached to a part
        for (uint8 i=0; i<MAX_TRIGGERS; i++) {
            (bytes24 triggerActionDefId, uint8 triggerType) = state.getTrigger(partKindId, i);
            if (triggerActionDefId == 0x0) {
                continue;
            }
            if (TriggerType(triggerType) != TriggerType.ACTION) {
                continue;
            }
            if (triggerActionDefId == actionDefId) {
                partImplementation.call(game, sender, partId, i, payload);
            }
        }
            
    }

    function _setStateVar(State state, bytes24 sender, bytes24 partId, uint8 stateVariableIndex, uint8 stateVariableElmIndex, bytes32 val) private {
        bytes24 partKindId = state.getPartKind(partId);
        require(partKindId != 0x0, 'no kind, maybe invalid partId');

        state.setData(partId, _getStateKey(0, stateVariableIndex, stateVariableElmIndex), val);

        // find all external triggers listening for this state change and call them
        for (uint8 i=0; i<listeners[partId][stateVariableIndex].length; i++) {
            StateListener storage t = listeners[partId][stateVariableIndex][i];
            bytes24 remotePartKindId = state.getPartKind(t.partId);
            if (remotePartKindId == 0x0) {
                continue;
            }
            PartKind partImplementation = PartKind(state.getImplementation(remotePartKindId));
            if (address(partImplementation) == address(0)) {
                continue;
            }
            partImplementation.call(game, partId, t.partId, t.triggerIndex, bytes(''));
        }
    }

    function _setPartVar(State state, bytes24 sender, bytes24 partId, uint8 partRefVariableIndex, uint8 partRefVariableElmIndex, bytes24 remotePartId) private {
        bytes24 partKindId = state.getPartKind(partId);
        require(partKindId != 0x0, 'no kind, maybe invalid partId');

        bytes24 remotePartKindId = state.getPartKind(remotePartId);
        require(remotePartKindId != 0x0, 'invalid remotePartKindId');

        // get the partdef
        bytes24 partRefDefId = Node.PartRefDef(partKindId, partRefVariableIndex);
        bytes24 partRefDefKindId = state.getPartRefDefKind(partRefDefId);
        require(remotePartKindId == partRefDefKindId, 'incompatible part assignment');

        state.setData(partId, _getStateKey(1, partRefVariableIndex, partRefVariableElmIndex), bytes32(uint256(uint192(remotePartId))));

        for (uint8 i=0; i<MAX_TRIGGERS; i++) {
            (bytes24 triggerRemotePartStateDefId, uint8 triggerType) = state.getTrigger(partKindId, i);
            if (triggerRemotePartStateDefId == 0x0) {
                continue;
            }
            if (TriggerType(triggerType) != TriggerType.STATE) {
                continue;
            }
            (bytes24 triggerRemotePartKindId, uint64 remoteStateIndex) = state.get(Rel.Is.selector, 0x0, triggerRemotePartStateDefId);
            if (triggerRemotePartKindId == 0x0) {
                continue;
            }
            if (triggerRemotePartKindId != remotePartKindId) {
                continue;
            }
            StateListener storage listener = listeners[remotePartId][uint8(remoteStateIndex)].push();
            listener.triggerIndex = i;
            listener.partId = partId;
        }
    }

    // dataKind is 0=STATE_VAR, 1=PART_VAR
    function _getStateKey(uint8 dataKind, uint8 stateVariableIndex, uint256 stateVariableElmIndex)
        internal
        pure
        returns (string memory)
    {
        return string(
            abi.encodePacked(LibString.toString(dataKind), "_", LibString.toString(stateVariableIndex), "_", LibString.toString(stateVariableElmIndex))
        );
    }


    function _registerPartActionTrigger(State state, bytes24 partKindId, uint8 triggerIndex, uint8 actionIndex) private {
        bytes24 actionDefId = Node.PartActionDef(partKindId, actionIndex);
        state.setTrigger(partKindId, actionDefId, triggerIndex, uint8(TriggerType.ACTION));
    }

    function _registerPartStateTrigger(State state, bytes24 partKindId, uint8 triggerIndex, bytes24 remotePartStateDefId) private {
        state.setTrigger(partKindId, remotePartStateDefId, triggerIndex, uint8(TriggerType.STATE));
    }

    function _registerPartKind(State state, bytes24 partKindId, bytes24 owner, string memory name, string memory model) private {
        state.annotate(partKindId, "name", name);
        state.annotate(partKindId, "model", model);
        state.setOwner(partKindId, owner);
    }

    function _registerPartAction(
        State state,
        bytes24 partKindId,
        uint8 actionIndex,
        string memory name,
        string[] memory argNames,
        uint8[] memory argTypes,
        bool[] memory argLists,
        uint256[] memory argLengths
    ) private {
        bytes24 actionDefId = Node.PartActionDef(partKindId, actionIndex);

        state.annotate(actionDefId, "name", name);
        for (uint8 i = 0; i < argNames.length; i++) {
            bytes24 partActionArgDef = Node.PartActionArgDef(partKindId, actionIndex, i);
            state.setActionArgDef(actionDefId, partActionArgDef, i, ArgType(argTypes[i]));
            state.annotate(partActionArgDef, "name", argNames[i]);
            state.setData(partActionArgDef, "list", bytes32(uint256(argLists[i] ? 1 : 0)));
            state.setData(partActionArgDef, "length", bytes32(uint256(argLengths[i])));
        }

        state.setActionDef(partKindId, actionDefId, actionIndex);
    }

    function _registerPartRef(
        State state,
        bytes24 partKindId,
        uint8 index,
        string memory name,
        bytes24 refPartKindId,
        bool list,
        uint256 length
    ) private {
        bytes24 partRefDefId = Node.PartRefDef(partKindId, index);
        state.annotate(partRefDefId, "name", name);
        state.setData(partRefDefId, "list", bytes32(uint256(list ? 1 : 0)));
        state.setData(partRefDefId, "length", bytes32(uint256(length)));
        state.setPartKind(partRefDefId, partKindId, index); // backlink from def -> kind

        state.setPartRefDef(partKindId, partRefDefId, index, refPartKindId);
    }

    function _registerPartState(
        State state,
        bytes24 partKindId,
        uint8 index,
        string memory argName,
        uint8 argType,
        bool argList,
        uint256 argLength
    ) private {
        bytes24 partStateDefId = Node.PartStateDef(partKindId, argName);
        state.annotate(partStateDefId, "name", argName);
        state.setData(partStateDefId, "list", bytes32(uint256(argList ? 1 : 0)));
        state.setData(partStateDefId, "length", bytes32(uint256(argLength)));
        state.setPartKind(partStateDefId, partKindId, index); // backlink from def -> kind

        state.setStateDef(partKindId, partStateDefId, index, ArgType(argType));
    }

    function _spawnPart(State state, bytes24 partKindId, int16 q, int16 r, int16 s) internal {
        bytes24 targetTile = Node.Tile(0, q, r, s);
        bytes24 partInstance = Node.Part(0, q, r, s);
        state.setPartKind(partInstance, partKindId);
        state.setFixedLocation(partInstance, targetTile);
    }
}

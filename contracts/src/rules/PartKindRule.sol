// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "cog/IGame.sol";
import "cog/IState.sol";
import "cog/IRule.sol";

import {Schema, Node, Kind, DEFAULT_ZONE, BuildingCategory, BuildingBlockNumKey} from "@ds/schema/Schema.sol";
import {TileUtils} from "@ds/utils/TileUtils.sol";
import {ItemUtils} from "@ds/utils/ItemUtils.sol";
import {Actions, ArgType} from "@ds/actions/Actions.sol";
import {BuildingKind} from "@ds/ext/BuildingKind.sol";
import {CraftingRule} from "@ds/rules/CraftingRule.sol";
import {IPartKind} from "@ds/ext/IPartKind.sol";

using Schema for State;

contract PartKindRule is Rule {
    Game game;

    constructor(Game g) {
        game = g;
    }

    function reduce(State state, bytes calldata action, Context calldata ctx) public returns (State) {
        if (bytes4(action) == Actions.REGISTER_PART_KIND.selector) {
            (bytes24 partKindId, string memory name, string memory model) =
                abi.decode(action[4:], (bytes24, string, string));

            _registerPartKind(state, partKindId, name, model);
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

        if (bytes4(action) == Actions.CALL_ACTION_ON_PART.selector) {
            (bytes24 partId, uint8 actionIndex, bytes memory payload) = abi.decode(action[4:], (bytes24, uint8, bytes));

            bytes24 partKindId = state.getPartKind(partId);

            IPartKind partImplementation = IPartKind(state.getImplementation(partKindId));
            if (address(partImplementation) != address(0)) {
                partImplementation.callAction(state, partId, actionIndex, payload);
            }
        }

        return state;
    }

    function _registerPartKind(State state, bytes24 partKindId, string memory name, string memory model) private {
        state.annotate(partKindId, "name", name);
        state.annotate(partKindId, "model", model);
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
        bytes24 partStateDefId = Node.PartStateDef(partKindId, index);
        state.annotate(partStateDefId, "name", argName);
        state.setData(partStateDefId, "list", bytes32(uint256(argList ? 1 : 0)));
        state.setData(partStateDefId, "length", bytes32(uint256(argLength)));

        state.setStateDef(partKindId, partStateDefId, index, ArgType(argType));
    }
}

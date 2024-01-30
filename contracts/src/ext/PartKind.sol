// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {State} from "cog/IState.sol";
import {Schema} from "@ds/schema/Schema.sol";
import {LibString} from "cog/utils/LibString.sol";

using Schema for State;

contract PartKind {
    // called by the CALL_PART_ACTION action
    function call(State state, bytes24 senderId, bytes24 thisPartId, uint8 logicBlockIndex, bytes memory actionArgs)
        public
        virtual
    {
        if (logicBlockIndex == 0) {
            logicBlock0(state, senderId, thisPartId, actionArgs);
        } else if (logicBlockIndex == 1) {
            logicBlock1(state, senderId, thisPartId, actionArgs);
        } else if (logicBlockIndex == 2) {
            logicBlock2(state, senderId, thisPartId, actionArgs);
        } else {
            revert("no logic for index");
        }
    }

    function logicBlock0(State, /*state*/ bytes24, /*sender*/ bytes24, /*partId*/ bytes memory /*payload*/ )
        internal
        virtual
    {
        revert("not implemented");
    }

    function logicBlock1(State, /*state*/ bytes24, /*sender*/ bytes24, /*partId*/ bytes memory /*payload*/ )
        internal
        virtual
    {
        revert("not implemented");
    }

    function logicBlock2(State, /*state*/ bytes24, /*sender*/ bytes24, /*partId*/ bytes memory /*payload*/ )
        internal
        virtual
    {
        revert("not implemented");
    }

    function getStateKey(uint8 stateVariableIndex, uint256 stateVariableElmIndex)
        internal
        pure
        returns (string memory)
    {
        return string(
            abi.encodePacked(LibString.toString(stateVariableIndex), "_", LibString.toString(stateVariableElmIndex))
        );
    }

    function setStateValue(
        State state,
        bytes24 thisPartId,
        uint8 stateVariableIndex,
        uint256 stateVariableElmIndex,
        int64 val
    ) internal {
        state.setData(thisPartId, getStateKey(stateVariableIndex, stateVariableElmIndex), bytes32(uint256(int256(val))));
    }

    function setStateValue(
        State state,
        bytes24 thisPartId,
        uint8 stateVariableIndex,
        uint256 stateVariableElmIndex,
        uint64 val
    ) internal {
        state.setData(thisPartId, getStateKey(stateVariableIndex, stateVariableElmIndex), bytes32(uint256(val)));
    }

    function setStateValue(
        State state,
        bytes24 thisPartId,
        uint8 stateVariableIndex,
        uint256 stateVariableElmIndex,
        address val
    ) internal {
        state.setData(thisPartId, getStateKey(stateVariableIndex, stateVariableElmIndex), bytes32(bytes20(val)));
    }

    function getStateInt64(State state, bytes24 thisPartId, uint8 stateVariableIndex, uint256 stateVariableElmIndex)
        internal
        view
        returns (int64)
    {
        return int64(int256(uint256(state.getData(thisPartId, getStateKey(stateVariableIndex, stateVariableElmIndex)))));
    }

    function incStateValue(
        State state,
        bytes24 thisPartId,
        uint8 stateVariableIndex,
        uint256 stateVariableElmIndex,
        int64 step
    ) internal {
        int64 currentVal =
            int64(int256(uint256(state.getData(thisPartId, getStateKey(stateVariableIndex, stateVariableElmIndex)))));
        state.setData(
            thisPartId,
            getStateKey(stateVariableIndex, stateVariableElmIndex),
            bytes32(uint256(int256(currentVal + step)))
        );
    }

    function decStateValue(
        State state,
        bytes24 thisPartId,
        uint8 stateVariableIndex,
        uint256 stateVariableElmIndex,
        int64 step
    ) internal {
        int64 currentVal =
            int64(int256(uint256(state.getData(thisPartId, getStateKey(stateVariableIndex, stateVariableElmIndex)))));
        state.setData(
            thisPartId,
            getStateKey(stateVariableIndex, stateVariableElmIndex),
            bytes32(uint256(int256(currentVal - step)))
        );
    }
}

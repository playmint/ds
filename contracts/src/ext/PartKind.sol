// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {State} from "cog/IState.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {Game} from "cog/IGame.sol";
import {Schema} from "@ds/schema/Schema.sol";
import {LibString} from "cog/utils/LibString.sol";

using Schema for State;

contract PartKind {
    // called by the CALL_PART_ACTION action
    function call(Game ds, bytes24 senderId, bytes24 thisPartId, uint8 logicBlockIndex, bytes memory actionArgs)
        public
        virtual
    {
        if (logicBlockIndex == 0) {
            logicBlock0(ds, senderId, thisPartId, actionArgs);
        } else if (logicBlockIndex == 1) {
            logicBlock1(ds, senderId, thisPartId, actionArgs);
        } else if (logicBlockIndex == 2) {
            logicBlock2(ds, senderId, thisPartId, actionArgs);
        } else {
            revert("no logic for index");
        }
    }

    function logicBlock0(Game, /*ds*/ bytes24, /*sender*/ bytes24, /*partId*/ bytes memory /*payload*/ )
        internal
        virtual
    {
        revert("not implemented");
    }

    function logicBlock1(Game, /*ds*/ bytes24, /*sender*/ bytes24, /*partId*/ bytes memory /*payload*/ )
        internal
        virtual
    {
        revert("not implemented");
    }

    function logicBlock2(Game, /*ds*/ bytes24, /*sender*/ bytes24, /*partId*/ bytes memory /*payload*/ )
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
        Game ds,
        bytes24 thisPartId,
        uint8 stateVariableIndex,
        uint8 stateVariableElmIndex,
        int64 val
    ) internal {
        setStateVariableData(
            ds,
            thisPartId,
            stateVariableIndex,
            stateVariableElmIndex,
            bytes32(uint256(int256(val)))
        );
    }

    function setStateValue(
        Game ds,
        bytes24 thisPartId,
        uint8 stateVariableIndex,
        uint8 stateVariableElmIndex,
        uint64 val
    ) internal {
        setStateVariableData(
            ds,
            thisPartId,
            stateVariableIndex,
            stateVariableElmIndex,
            bytes32(uint256(val))
        );
    }

    function setStateValue(
        Game ds,
        bytes24 thisPartId,
        uint8 stateVariableIndex,
        uint8 stateVariableElmIndex,
        address val
    ) internal {
        setStateVariableData(
            ds,
            thisPartId,
            stateVariableIndex,
            stateVariableElmIndex,
            bytes32(bytes20(val))
        );
    }

    function getStateInt64(Game ds, bytes24 thisPartId, uint8 stateVariableIndex, uint256 stateVariableElmIndex)
        internal
        returns (int64)
    {
        return int64(int256(uint256(ds.getState().getData(thisPartId, getStateKey(stateVariableIndex, stateVariableElmIndex)))));
    }

    function incStateValue(
        Game ds,
        bytes24 thisPartId,
        uint8 stateVariableIndex,
        uint8 stateVariableElmIndex,
        int64 step
    ) internal {
        int64 currentVal =
            int64(int256(uint256(ds.getState().getData(thisPartId, getStateKey(stateVariableIndex, stateVariableElmIndex)))));
        setStateVariableData(
            ds,
            thisPartId,
            stateVariableIndex,
            stateVariableElmIndex,
            bytes32(uint256(int256(currentVal + step)))
        );
    }

    function decStateValue(
        Game ds,
        bytes24 thisPartId,
        uint8 stateVariableIndex,
        uint8 stateVariableElmIndex,
        int64 step
    ) internal {
        int64 currentVal =
            int64(int256(uint256(ds.getState().getData(thisPartId, getStateKey(stateVariableIndex, stateVariableElmIndex)))));
        setStateVariableData(
            ds,
            thisPartId,
            stateVariableIndex,
            stateVariableElmIndex,
            bytes32(uint256(int256(currentVal - step)))
        );
    }

    function setStateVariableData(
        Game ds,
        bytes24 thisPartId,
        uint8 stateVariableIndex,
        uint8 stateVariableElmIndex,
        bytes32 val
    ) internal {
        ds.getDispatcher().dispatch(
            abi.encodeCall(
                Actions.SET_STATE_VAR_ON_PART,
                (thisPartId, stateVariableIndex, stateVariableElmIndex, val)
            )
        );
    }
}

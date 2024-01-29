// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {State} from "cog/IState.sol";
import {Schema} from "@ds/schema/Schema.sol";
import {LibString} from "cog/utils/LibString.sol";

using Schema for State;

contract PartKind {

    // called by the CALL_PART_ACTION action
    function call(State state, bytes24 senderId, bytes24 thisPartId, uint8 logicBlockIndex, bytes memory actionArgs) virtual public {
        if (logicBlockIndex == 0) {
             logicBlock0(state, senderId, thisPartId, actionArgs);
        } else if (logicBlockIndex == 1) {
             logicBlock1(state, senderId, thisPartId, actionArgs);
        } else if (logicBlockIndex == 2) {
             logicBlock2(state, senderId, thisPartId, actionArgs);
        } else {
            revert('no logic for index');
        }
    }

    function logicBlock0(State /*state*/, bytes24 /*sender*/, bytes24 /*partId*/, bytes memory /*payload*/) virtual internal {
        revert('not implemented');
    }
    function logicBlock1(State /*state*/, bytes24 /*sender*/, bytes24 /*partId*/, bytes memory /*payload*/) virtual internal {
        revert('not implemented');
    }
    function logicBlock2(State /*state*/, bytes24 /*sender*/, bytes24 /*partId*/, bytes memory /*payload*/) virtual internal {
        revert('not implemented');
    }


    function getValueFromTrigger(State state, bytes24 thisPartId, uint8 stateVariableIndex, int64 val) internal {
    }

    function setStateValue(State state, bytes24 thisPartId, uint8 stateVariableIndex, int64 val) internal {
        state.setData(
            thisPartId,
            LibString.toString(stateVariableIndex),
            bytes32(uint256(int256(val)))
        );
    }

    function setStateValue(State state, bytes24 thisPartId, uint8 stateVariableIndex, address val) internal {
        state.setData(
            thisPartId,
            LibString.toString(stateVariableIndex),
            bytes32(bytes20(val))
        );
    }

    function getStateInt64(State state, bytes24 thisPartId, uint8 stateVariableIndex) internal view returns (int64) {
        return int64(int256(uint256(state.getData(
            thisPartId,
            LibString.toString(stateVariableIndex)
        ))));
    }

    function incStateValue(State state, bytes24 thisPartId, uint8 stateVariableIndex, int64 step) internal {
        int64 currentVal = int64(int256(uint256(state.getData(
            thisPartId,
            LibString.toString(stateVariableIndex)
        ))));
        state.setData(
            thisPartId,
            LibString.toString(stateVariableIndex),
            bytes32(uint256(int256(currentVal + step)))
        );
    }

}

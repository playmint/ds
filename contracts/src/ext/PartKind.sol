// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {State} from "cog/IState.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {Game} from "cog/IGame.sol";
import {Schema, Rel} from "@ds/schema/Schema.sol";
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

    // dataKind is 0=STATE_VAR, 1=PART_VAR
    function getStateKey(uint8 dataKind, uint8 stateVariableIndex, uint256 stateVariableElmIndex)
        internal
        pure
        returns (string memory)
    {
        return string(
            abi.encodePacked(
                LibString.toString(dataKind),
                "_",
                LibString.toString(stateVariableIndex),
                "_",
                LibString.toString(stateVariableElmIndex)
            )
        );
    }

    function setStateValue(
        Game ds,
        bytes24 thisPartId,
        uint8 stateVariableIndex,
        uint256 stateVariableElmIndex,
        int64 val
    ) internal {
        setStateVariableData(ds, thisPartId, stateVariableIndex, stateVariableElmIndex, bytes32(uint256(int256(val))));
    }

    function setStateValue(
        Game ds,
        bytes24 thisPartId,
        uint8 stateVariableIndex,
        uint256 stateVariableElmIndex,
        uint64 val
    ) internal {
        setStateVariableData(ds, thisPartId, stateVariableIndex, stateVariableElmIndex, bytes32(uint256(val)));
    }

    function setStateValue(
        Game ds,
        bytes24 thisPartId,
        uint8 stateVariableIndex,
        uint256 stateVariableElmIndex,
        address val
    ) internal {
        setStateVariableData(ds, thisPartId, stateVariableIndex, stateVariableElmIndex, bytes32(bytes20(val)));
    }

    function getStateInt64(Game ds, bytes24 thisPartId, uint8 stateVariableIndex, uint256 stateVariableElmIndex)
        internal
        returns (int64)
    {
        return int64(
            int256(
                uint256(ds.getState().getData(thisPartId, getStateKey(0, stateVariableIndex, stateVariableElmIndex)))
            )
        );
    }

    function incStateValue(
        Game ds,
        bytes24 thisPartId,
        uint8 stateVariableIndex,
        uint256 stateVariableElmIndex,
        int64 step
    ) internal {
        int64 currentVal = int64(
            int256(
                uint256(ds.getState().getData(thisPartId, getStateKey(0, stateVariableIndex, stateVariableElmIndex)))
            )
        );
        setStateVariableData(
            ds, thisPartId, stateVariableIndex, stateVariableElmIndex, bytes32(uint256(int256(currentVal + step)))
        );
    }

    function incStateValue(
        Game ds,
        bytes24 thisPartId,
        uint8 stateVariableIndex,
        uint256 stateVariableElmIndex,
        uint64 step
    ) internal {
        uint64 currentVal = uint64(
            uint256(ds.getState().getData(thisPartId, getStateKey(0, stateVariableIndex, stateVariableElmIndex)))
        );
        setStateVariableData(
            ds, thisPartId, stateVariableIndex, stateVariableElmIndex, bytes32(uint256(currentVal + step))
        );
    }

    function decStateValue(
        Game ds,
        bytes24 thisPartId,
        uint8 stateVariableIndex,
        uint256 stateVariableElmIndex,
        int64 step
    ) internal {
        int64 currentVal = int64(
            int256(
                uint256(ds.getState().getData(thisPartId, getStateKey(0, stateVariableIndex, stateVariableElmIndex)))
            )
        );
        setStateVariableData(
            ds, thisPartId, stateVariableIndex, stateVariableElmIndex, bytes32(uint256(int256(currentVal - step)))
        );
    }

    function decStateValue(
        Game ds,
        bytes24 thisPartId,
        uint8 stateVariableIndex,
        uint256 stateVariableElmIndex,
        uint64 step
    ) internal {
        uint64 currentVal = uint64(
            uint256(ds.getState().getData(thisPartId, getStateKey(0, stateVariableIndex, stateVariableElmIndex)))
        );

        setStateVariableData(
            ds, thisPartId, stateVariableIndex, stateVariableElmIndex, bytes32(uint256(currentVal - step))
        );
    }

    function setStateVariableData(
        Game ds,
        bytes24 thisPartId,
        uint8 stateVariableIndex,
        uint256 stateVariableElmIndex,
        bytes32 val
    ) internal {
        ds.getDispatcher().dispatch(
            abi.encodeCall(
                Actions.SET_STATE_VAR_ON_PART, (thisPartId, stateVariableIndex, uint8(stateVariableElmIndex), val)
            )
        );
    }

    function getValueFromPartInt64(
        Game ds,
        bytes24 thisPartId,
        uint8 partVariableIndex,
        uint8 partVariableElmIndex,
        bytes24 stateDefId,
        uint8 connectedStateElmIndex
    ) internal returns (int64) {
        State state = ds.getState();
        bytes24 connectedPartId = bytes24(
            uint192(
                uint256(state.getData(thisPartId, getStateKey(1, partVariableIndex, partVariableElmIndex)))
            )
        );
        require(connectedPartId != 0x0, 'no part connected');

        bytes24 connectedPartKindId = state.getPartKind(connectedPartId);
        require(connectedPartKindId != 0x0, 'invalid connected part: no kind');

        (bytes24 stateDefParentKindId, uint64 connectedStateIndex) = state.get(Rel.Is.selector, 0x0, stateDefId);
        require(stateDefParentKindId != 0x0, 'no state def parent kind');
        require(stateDefParentKindId == connectedPartKindId, 'invalid state def given');

        // read the remote state value
        return int64(
            int256(
                uint256(state.getData(connectedPartId, getStateKey(0, uint8(connectedStateIndex), connectedStateElmIndex)))
            )
        );
    }
    
}

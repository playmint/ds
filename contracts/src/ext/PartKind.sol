// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {State} from "cog/IState.sol";
import {Schema} from "@ds/schema/Schema.sol";

using Schema for State;

// contract Generated is PartKind {
//     function logicBlock0(State state, bytes24 sender, bytes24 partId, bytes memory payload) override internal {
//         revert('broken');
//     }
// }

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

    function logicBlock0(State state, bytes24 sender, bytes24 partId, bytes memory payload) virtual internal {
        revert('not implemented');
    }
    function logicBlock1(State state, bytes24 sender, bytes24 partId, bytes memory payload) virtual internal {
        revert('not implemented');
    }
    function logicBlock2(State state, bytes24 sender, bytes24 partId, bytes memory payload) virtual internal {
        revert('not implemented');
    }
}

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Game} from "cog/IGame.sol";
import {State} from "cog/IState.sol";
import {Schema} from "@ds/schema/Schema.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {BuildingKind} from "@ds/ext/BuildingKind.sol";
import "@ds/utils/Base64.sol";
import "@ds/utils/LibString.sol";

using Schema for State;

contract SessionTimer5 is BuildingKind {

    uint256 endBlock = 0;

    // we expect payload to contain a single 4 byte number reperesenting length of session in blocks
    function use(Game ds, bytes24 buildingInstance, bytes24, /*actor*/ bytes memory payload ) public {
        // convert payload
        uint32 sessionBlocks;
        for (uint i = 0; i < 4; i++) {
            sessionBlocks = (sessionBlocks << 8) | uint32(uint8(payload[i]));
        }

        // add session length to current block number and write it to the building description
        endBlock = block.number + sessionBlocks;
        
        // write the end block to the building kind description so plugin can see it
        State state = GetState(ds);
        bytes24 buildingkind = state.getBuildingKind(buildingInstance);
        state.annotate(
            buildingkind, 
            "description", 
            LibString.toString(endBlock));
    }

    function GetState(Game ds) internal returns (State) {
        return ds.getState();
    }
}

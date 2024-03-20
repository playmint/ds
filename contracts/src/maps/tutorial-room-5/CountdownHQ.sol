// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Game} from "cog/IGame.sol";
import {State} from "cog/IState.sol";
import {Schema} from "@ds/schema/Schema.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {BuildingKind} from "@ds/ext/BuildingKind.sol";

using Schema for State;

contract CountdownHQ is BuildingKind {
    function startTimer(uint256 endBlock) external {}

    function use(Game ds, bytes24 buildingInstance, bytes24, /*actor*/ bytes calldata payload) public override {
        if ((bytes4)(payload) == this.startTimer.selector) {
            (uint256 endBlock) = abi.decode(payload[4:], (uint256));
            _startTimer(ds, buildingInstance, endBlock);
        }
    }

    function _startTimer(Game ds, bytes24 buildingInstance, uint256 endBlock) internal {
        ds.getDispatcher().dispatch(
            abi.encodeCall(Actions.SET_DATA_ON_BUILDING, (buildingInstance, "startBlock", bytes32(block.number)))
        );

        ds.getDispatcher().dispatch(
            abi.encodeCall(Actions.SET_DATA_ON_BUILDING, (buildingInstance, "endBlock", bytes32(endBlock)))
        );
    }
}

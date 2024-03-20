// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Game} from "cog/IGame.sol";
import {State} from "cog/IState.sol";
import {Schema} from "@ds/schema/Schema.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {BuildingKind} from "@ds/ext/BuildingKind.sol";

using Schema for State;

contract CounterHQ is BuildingKind {
    function increment() external {}

    function use(Game ds, bytes24 buildingInstance, bytes24, /*actor*/ bytes calldata payload) public override {
        if ((bytes4)(payload) == this.increment.selector) {
            _increment(ds, buildingInstance);
        }
    }

    function _increment(Game ds, bytes24 buildingInstance) internal {
        State state = ds.getState();

        uint256 count = uint256(state.getData(buildingInstance, "count"));
        ds.getDispatcher().dispatch(
            abi.encodeCall(Actions.SET_DATA_ON_BUILDING, (buildingInstance, "count", bytes32(count + 1)))
        );
    }
}

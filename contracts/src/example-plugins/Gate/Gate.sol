// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Game} from "cog/IGame.sol";
import {Dispatcher} from "cog/IDispatcher.sol";
import {State} from "cog/IState.sol";
import {Schema} from "@ds/schema/Schema.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {BuildingKind} from "@ds/ext/BuildingKind.sol";

using Schema for State;

contract ExampleGate is BuildingKind {
    function onUnitArrive(Game ds, bytes24 buildingInstanceID, bytes24 mobileUnitID) public override {
        _setDataOnBuilding(ds.getDispatcher(), buildingInstanceID, "unitArrive", bytes32(mobileUnitID));
    }

    function onUnitLeave(Game ds, bytes24 buildingInstanceID, bytes24 mobileUnitID) public override {
        _setDataOnBuilding(ds.getDispatcher(), buildingInstanceID, "unitLeave", bytes32(mobileUnitID));
    }

    function _setDataOnBuilding(Dispatcher dispatcher, bytes24 buildingId, string memory key, bytes32 value) internal {
        dispatcher.dispatch(abi.encodeCall(Actions.SET_DATA_ON_BUILDING, (buildingId, key, value)));
    }
}

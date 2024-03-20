// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Game} from "cog/IGame.sol";
import {State} from "cog/IState.sol";
import {Schema, Node} from "@ds/schema/Schema.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {BuildingKind} from "@ds/ext/BuildingKind.sol";

using Schema for State;

contract UnitController is BuildingKind {
    function spawnUnit() external {}
    function moveUnitNE(bytes24 mobileUnit) external {}
    function moveUnitE(bytes24 mobileUnit) external {}
    function moveUnitSE(bytes24 mobileUnit) external {}
    function moveUnitSW(bytes24 mobileUnit) external {}
    function moveUnitW(bytes24 mobileUnit) external {}
    function moveUnitNW(bytes24 mobileUnit) external {}

    function use(Game ds, bytes24 buildingInstance, bytes24, /*actor*/ bytes calldata payload) public override {
        if ((bytes4)(payload) == this.spawnUnit.selector) {
            _spawnUnit(ds);
        } else if ((bytes4)(payload) == this.moveUnitNE.selector) {
            (bytes24 mobileUnit) = abi.decode(payload[4:], (bytes24));
            _moveUnitNE(ds, buildingInstance, mobileUnit);
        } else if ((bytes4)(payload) == this.moveUnitE.selector) {
            (bytes24 mobileUnit) = abi.decode(payload[4:], (bytes24));
            _moveUnitE(ds, buildingInstance, mobileUnit);
        } else if ((bytes4)(payload) == this.moveUnitSE.selector) {
            (bytes24 mobileUnit) = abi.decode(payload[4:], (bytes24));
            _moveUnitSE(ds, buildingInstance, mobileUnit);
        } else if ((bytes4)(payload) == this.moveUnitSW.selector) {
            (bytes24 mobileUnit) = abi.decode(payload[4:], (bytes24));
            _moveUnitSW(ds, buildingInstance, mobileUnit);
        } else if ((bytes4)(payload) == this.moveUnitW.selector) {
            (bytes24 mobileUnit) = abi.decode(payload[4:], (bytes24));
            _moveUnitW(ds, buildingInstance, mobileUnit);
        } else if ((bytes4)(payload) == this.moveUnitNW.selector) {
            (bytes24 mobileUnit) = abi.decode(payload[4:], (bytes24));
            _moveUnitNW(ds, buildingInstance, mobileUnit);
        }
    }

    function _spawnUnit(Game ds) internal {
        // function SPAWN_MOBILE_UNIT(bytes24 mobileUnit) external;
        bytes24 mobileUnit = Node.MobileUnit(uint64(uint256(keccak256(abi.encode(block.number)))));
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.SPAWN_MOBILE_UNIT, (mobileUnit)));
    }

    function _moveUnitNE(Game ds, bytes24 buildingInstance, bytes24 mobileUnit) internal {}

    function _moveUnitE(Game ds, bytes24 buildingInstance, bytes24 mobileUnit) internal {}

    function _moveUnitSE(Game ds, bytes24 buildingInstance, bytes24 mobileUnit) internal {}

    function _moveUnitSW(Game ds, bytes24 buildingInstance, bytes24 mobileUnit) internal {}

    function _moveUnitW(Game ds, bytes24 buildingInstance, bytes24 mobileUnit) internal {}

    function _moveUnitNW(Game ds, bytes24 buildingInstance, bytes24 mobileUnit) internal {}
}

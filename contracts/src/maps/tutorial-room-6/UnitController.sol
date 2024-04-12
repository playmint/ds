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
    function moveUnitNE() external {}
    function moveUnitE() external {}
    function moveUnitSE() external {}
    function moveUnitSW() external {}
    function moveUnitW() external {}
    function moveUnitNW() external {}

    function use(Game ds, bytes24 buildingInstance, bytes24, /*actor*/ bytes calldata payload) public override {
        if ((bytes4)(payload) == this.spawnUnit.selector) {
            _spawnUnit(ds, buildingInstance);
        } else if ((bytes4)(payload) == this.moveUnitNE.selector) {
            _moveUnit(ds, [int16(0), int16(1), int16(-1)]);
        } else if ((bytes4)(payload) == this.moveUnitE.selector) {
            _moveUnit(ds, [int16(1), int16(0), int16(-1)]);
        } else if ((bytes4)(payload) == this.moveUnitSE.selector) {
            _moveUnit(ds, [int16(1), int16(-1), int16(0)]);
        } else if ((bytes4)(payload) == this.moveUnitSW.selector) {
            _moveUnit(ds, [int16(0), int16(-1), int16(1)]);
        } else if ((bytes4)(payload) == this.moveUnitW.selector) {
            _moveUnit(ds, [int16(-1), int16(0), int16(1)]);
        } else if ((bytes4)(payload) == this.moveUnitNW.selector) {
            _moveUnit(ds, [int16(-1), int16(1), int16(0)]);
        }
    }

    function _spawnUnit(Game ds, bytes24 buildingInstance) internal {
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.SPAWN_MOBILE_UNIT, ()));

        // Move mobile unit next to the building
        (int16 z, int16 q, int16 r, int16 s) = _getTileCoords(ds.getState().getFixedLocation(buildingInstance));
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.MOVE_MOBILE_UNIT, (z, q + 1, r, s - 1)));
    }

    function _moveUnit(Game ds, int16[3] memory direction) internal {
        (int16 z, int16 q, int16 r, int16 s) = _getUnitCoords(ds);
        ds.getDispatcher().dispatch(
            abi.encodeCall(Actions.MOVE_MOBILE_UNIT, (z, q + direction[0], r + direction[1], s + direction[2]))
        );
    }

    function _getUnitCoords(Game ds) internal returns (int16 z, int16 q, int16 r, int16 s) {
        bytes24 mobileUnit = Node.MobileUnit(address(this));
        State state = ds.getState();
        bytes24 tile = state.getCurrentLocation(mobileUnit, uint64(block.number));
        return _getTileCoords(tile);
    }

    function _getTileCoords(bytes24 tile) public pure returns (int16 z, int16 q, int16 r, int16 s) {
        z = int16(int192(uint192(tile) >> 48));
        q = int16(int192(uint192(tile) >> 32));
        r = int16(int192(uint192(tile) >> 16));
        s = int16(int192(uint192(tile)));
    }
}

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

    function use(Game ds, bytes24 buildingInstance, bytes24 actor, bytes calldata payload) public override {
        if ((bytes4)(payload) == this.spawnUnit.selector) {
            _spawnUnit(ds, buildingInstance, actor);
        } else if ((bytes4)(payload) == this.moveUnitNE.selector) {
            (bytes24 mobileUnit) = abi.decode(payload[4:], (bytes24));
            _moveUnit(ds, mobileUnit, [int16(0), int16(1), int16(-1)]);
        } else if ((bytes4)(payload) == this.moveUnitE.selector) {
            (bytes24 mobileUnit) = abi.decode(payload[4:], (bytes24));
            _moveUnit(ds, mobileUnit, [int16(1), int16(0), int16(-1)]);
        } else if ((bytes4)(payload) == this.moveUnitSE.selector) {
            (bytes24 mobileUnit) = abi.decode(payload[4:], (bytes24));
            _moveUnit(ds, mobileUnit, [int16(1), int16(-1), int16(0)]);
        } else if ((bytes4)(payload) == this.moveUnitSW.selector) {
            (bytes24 mobileUnit) = abi.decode(payload[4:], (bytes24));
            _moveUnit(ds, mobileUnit, [int16(0), int16(-1), int16(1)]);
        } else if ((bytes4)(payload) == this.moveUnitW.selector) {
            (bytes24 mobileUnit) = abi.decode(payload[4:], (bytes24));
            _moveUnit(ds, mobileUnit, [int16(-1), int16(0), int16(1)]);
        } else if ((bytes4)(payload) == this.moveUnitNW.selector) {
            (bytes24 mobileUnit) = abi.decode(payload[4:], (bytes24));
            _moveUnit(ds, mobileUnit, [int16(-1), int16(1), int16(0)]);
        }
    }

    function _spawnUnit(Game ds, bytes24 buildingInstance, bytes24 actor) internal {
        bytes24 mobileUnit = Node.MobileUnit(uint32(uint256(keccak256(abi.encodePacked(block.number, actor)))));
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.SPAWN_MOBILE_UNIT, (mobileUnit)));

        // Move mobile unit next to the building
        (int16 q, int16 r, int16 s) = _getTileCoords(ds.getState().getFixedLocation(buildingInstance));
        ds.getDispatcher().dispatch(
            abi.encodeCall(Actions.MOVE_MOBILE_UNIT, (uint32(uint192(mobileUnit)), q + 1, r, s - 1))
        );
    }

    function _moveUnit(Game ds, bytes24 mobileUnit, int16[3] memory direction) internal {
        (int16 q, int16 r, int16 s) = _getUnitCoords(ds, mobileUnit);
        ds.getDispatcher().dispatch(
            abi.encodeCall(
                Actions.MOVE_MOBILE_UNIT,
                (uint32(uint192(mobileUnit)), q + direction[0], r + direction[1], s + direction[2])
            )
        );
    }

    function _getUnitCoords(Game ds, bytes24 mobileUnit) internal returns (int16 q, int16 r, int16 s) {
        State state = ds.getState();
        bytes24 tile = state.getCurrentLocation(mobileUnit, uint64(block.number));
        return _getTileCoords(tile);
    }

    function _getTileCoords(bytes24 tile) public pure returns (int16 q, int16 r, int16 s) {
        q = int16(int192(uint192(tile) >> 32));
        r = int16(int192(uint192(tile) >> 16));
        s = int16(int192(uint192(tile)));
    }
}

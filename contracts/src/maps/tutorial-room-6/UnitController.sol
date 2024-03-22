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
            _spawnUnit(ds, buildingInstance);
        } else if ((bytes4)(payload) == this.moveUnitNE.selector) {
            (bytes24 mobileUnit) = abi.decode(payload[4:], (bytes24));
            _moveUnitNE(ds, mobileUnit);
        } else if ((bytes4)(payload) == this.moveUnitE.selector) {
            (bytes24 mobileUnit) = abi.decode(payload[4:], (bytes24));
            _moveUnitE(ds, mobileUnit);
        } else if ((bytes4)(payload) == this.moveUnitSE.selector) {
            (bytes24 mobileUnit) = abi.decode(payload[4:], (bytes24));
            _moveUnitSE(ds, mobileUnit);
        } else if ((bytes4)(payload) == this.moveUnitSW.selector) {
            (bytes24 mobileUnit) = abi.decode(payload[4:], (bytes24));
            _moveUnitSW(ds, mobileUnit);
        } else if ((bytes4)(payload) == this.moveUnitW.selector) {
            (bytes24 mobileUnit) = abi.decode(payload[4:], (bytes24));
            _moveUnitW(ds, mobileUnit);
        } else if ((bytes4)(payload) == this.moveUnitNW.selector) {
            (bytes24 mobileUnit) = abi.decode(payload[4:], (bytes24));
            _moveUnitNW(ds, mobileUnit);
        }
    }

    function _spawnUnit(Game ds, bytes24 buildingInstance) internal {
        bytes24 mobileUnit = Node.MobileUnit(uint32(uint256(keccak256(abi.encode(block.number)))));
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.SPAWN_MOBILE_UNIT, (mobileUnit)));

        // Move mobile unit next to the building
        (int16 q, int16 r, int16 s) = _getTileCoords(ds.getState().getFixedLocation(buildingInstance));
        ds.getDispatcher().dispatch(
            abi.encodeCall(Actions.MOVE_MOBILE_UNIT, (uint32(uint192(mobileUnit)), q + 1, r, s - 1))
        );
    }

    function _moveUnitNE(Game ds, bytes24 mobileUnit) internal {
        (int16 q, int16 r, int16 s) = _getUnitCoords(ds, mobileUnit);
        ds.getDispatcher().dispatch(
            abi.encodeCall(Actions.MOVE_MOBILE_UNIT, (uint32(uint192(mobileUnit)), q, r + 1, s - 1))
        );
    }

    function _moveUnitE(Game ds, bytes24 mobileUnit) internal {
        (int16 q, int16 r, int16 s) = _getUnitCoords(ds, mobileUnit);
        ds.getDispatcher().dispatch(
            abi.encodeCall(Actions.MOVE_MOBILE_UNIT, (uint32(uint192(mobileUnit)), q + 1, r, s - 1))
        );
    }

    function _moveUnitSE(Game ds, bytes24 mobileUnit) internal {
        (int16 q, int16 r, int16 s) = _getUnitCoords(ds, mobileUnit);
        ds.getDispatcher().dispatch(
            abi.encodeCall(Actions.MOVE_MOBILE_UNIT, (uint32(uint192(mobileUnit)), q + 1, r - 1, s))
        );
    }

    function _moveUnitSW(Game ds, bytes24 mobileUnit) internal {
        (int16 q, int16 r, int16 s) = _getUnitCoords(ds, mobileUnit);
        ds.getDispatcher().dispatch(
            abi.encodeCall(Actions.MOVE_MOBILE_UNIT, (uint32(uint192(mobileUnit)), q, r - 1, s + 1))
        );
    }

    function _moveUnitW(Game ds, bytes24 mobileUnit) internal {
        (int16 q, int16 r, int16 s) = _getUnitCoords(ds, mobileUnit);
        ds.getDispatcher().dispatch(
            abi.encodeCall(Actions.MOVE_MOBILE_UNIT, (uint32(uint192(mobileUnit)), q - 1, r, s + 1))
        );
    }

    function _moveUnitNW(Game ds, bytes24 mobileUnit) internal {
        (int16 q, int16 r, int16 s) = _getUnitCoords(ds, mobileUnit);
        ds.getDispatcher().dispatch(
            abi.encodeCall(Actions.MOVE_MOBILE_UNIT, (uint32(uint192(mobileUnit)), q - 1, r + 1, s))
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

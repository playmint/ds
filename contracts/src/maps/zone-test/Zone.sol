// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Game} from "cog/IGame.sol";
import {State, CompoundKeyDecoder} from "cog/IState.sol";
import {Schema} from "@ds/schema/Schema.sol";
import {ZoneKind} from "@ds/ext/ZoneKind.sol";
import {Actions} from "@ds/actions/Actions.sol";

using Schema for State;

contract TestZone is ZoneKind {
    function destroyBuilding(bytes24 b) external {}

    function use(Game ds, bytes24 zoneID, bytes24 mobileUnitID, bytes calldata payload) public override {
        State state = ds.getState();
        if ((bytes4)(payload) == this.destroyBuilding.selector) {
            (bytes24 buildingInstance) = abi.decode(payload[4:], (bytes24));
            bytes24 tile = state.getFixedLocation(buildingInstance);
            (int16 z, int16 q, int16 r, int16 s) = getTileCoords(tile);
            ds.getDispatcher().dispatch(abi.encodeCall(Actions.DEV_DESTROY_BUILDING, (z, q, r, s)));
        }
    }

    function getTileCoords(bytes24 tile) internal pure returns (int16, int16, int16, int16) {
        int16[4] memory keys = CompoundKeyDecoder.INT16_ARRAY(tile);
        return (keys[0], keys[1], keys[2], keys[3]);
    }

    function onTransferItem(
        Game ds,
        bytes24 zoneID,
        bytes24 actor,
        bytes24[2] memory equipee,
        uint8[2] memory equipSlot,
        uint8[2] memory itemSlot,
        bytes24 toBagId,
        uint64 qty
    ) external override {
        // revert("No transerring in my zone buddy!");
    }

    function onUnitArrive(Game ds, bytes24 zoneID, bytes24 mobileUnitID) external override {
        _increment(ds, zoneID);
    }

    function _increment(Game ds, bytes24 zoneID) internal {
        State state = ds.getState();

        uint256 count = uint256(state.getData(zoneID, "count"));
        ds.getDispatcher().dispatch(
            abi.encodeCall(Actions.SET_DATA_ON_ZONE, (zoneID, "count", bytes32(count + 1)))
        );
    }

    // function onContructBuilding(Game ds, bytes24 zoneID, bytes24 mobileUnitID, bytes24 buildingInstance) external override {
    //     revert ("no building on my turf bucko!");
    // }
    // function onDestroyBuilding(Game ds, bytes24 zoneID, bytes24 buildingInstance, bytes24 buildingKind) external override {
    //     revert("no destroying on my turf bucko!");
    // }
}

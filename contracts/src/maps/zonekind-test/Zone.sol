// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Game} from "cog/IGame.sol";
import {State, CompoundKeyDecoder} from "cog/IState.sol";
import {Schema, CombatWinState} from "@ds/schema/Schema.sol";
import {ZoneKind} from "@ds/ext/ZoneKind.sol";
import {Actions} from "@ds/actions/Actions.sol";

using Schema for State;

contract TestZone is ZoneKind {
    function destroyBuilding(bytes24 b) external {}

    function use(Game ds, bytes24, /*zoneID*/ bytes24, /*mobileUnitID*/ bytes calldata payload) public override {
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

    // function onUnitArrive(Game ds, bytes24 zoneID, bytes24 mobileUnitID) external override {
    //     _increment(ds, zoneID, "unitArriveCount");
    // }

    // function onAcceptQuest(Game ds, bytes24 zoneID, bytes24 quest, uint8 questNum, bytes24 player) external override {
    //     _increment(ds, zoneID, "questAcceptCount");
    // }

    // function onCompleteQuest(Game ds, bytes24 zoneID, bytes24 quest, uint8 questNum, bytes24 player)
    //     external
    //     override
    // {
    //     _increment(ds, zoneID, "questCompleteCount");
    // }

    // function onExtract(
    //     Game ds,
    //     bytes24 zoneID,
    //     bytes24 player,
    //     bytes24 buildingInstance,
    //     bytes24 outputItemID,
    //     uint64 qty
    // ) external override {
    //     _increment(ds, zoneID, "extractCount");
    // }

    // function onCraft(
    //     Game ds,
    //     bytes24 zoneID,
    //     bytes24 player,
    //     bytes24 buildingInstance,
    //     bytes24 outputItemID,
    //     uint64 qty
    // ) external override {
    //     _increment(ds, zoneID, "craftCount");
    // }

    // function onCombatFinalise(Game ds, bytes24 zoneID, bytes24 sessionId, CombatWinState winState) external override {
    //     _increment(ds, zoneID, "combatCount");
    //     if (winState == CombatWinState.ATTACKERS) _increment(ds, zoneID, "attackerWinCount");
    //     else if (winState == CombatWinState.DEFENDERS) _increment(ds, zoneID, "defenderWinCount");
    // }

    function _increment(Game ds, bytes24 zoneID, string memory name) internal {
        State state = ds.getState();

        uint256 count = uint256(state.getData(zoneID, name));
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.SET_DATA_ON_ZONE, (zoneID, name, bytes32(count + 1))));
    }
}

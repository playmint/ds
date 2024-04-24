// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "cog/IGame.sol";
import "cog/IState.sol";

import {CombatState} from "@ds/schema/Schema.sol";

interface IZoneKind {
    function use(Game ds, bytes24 zoneID, bytes24 mobileUnitID, bytes calldata payload) external;
    function onUnitArrive(Game ds, bytes24 zoneID, bytes24 mobileUnitID) external;
    function onCombatStart(Game ds, bytes24 zoneID, bytes24 mobileUnitID, bytes24 sessionID) external;
    function onCombatJoin(Game ds, bytes24 zoneID, bytes24 mobileUnitID, bytes24 sessionID) external;
    function onCombatLeave(Game ds, bytes24 zoneID, bytes24 mobileUnitID, bytes24 sessionID) external;
    function onCombatFinalise(Game ds, bytes24 zoneID, bytes24 sessionId, CombatState memory combatState) external;
    function onTransferItem(
        Game ds,
        bytes24 zoneID,
        bytes24 actor,
        bytes24[2] memory equipee,
        uint8[2] memory equipSlot,
        uint8[2] memory itemSlot,
        bytes24 toBagId,
        uint64 qty
    ) external;
    function onContructBuilding(Game ds, bytes24 zoneID, bytes24 mobileUnitID, bytes24 buildingInstance) external;
    function onDestroyBuilding(Game ds, bytes24 zoneID, bytes24 buildingInstance, bytes24 buildingKind) external;
    function onAcceptQuest(Game ds, bytes24 zoneID, bytes24 quest, uint8 questNum, bytes24 player) external;
    function onCompleteQuest(Game ds, bytes24 zoneID, bytes24 quest, uint8 questNum, bytes24 player) external;
    function onExtract(Game ds, bytes24 zoneID, bytes24 player, bytes24 buildingInstance, bytes24 outputItemID, uint64 qty) external;
    function onCraft(Game ds, bytes24 zoneID, bytes24 player, bytes24 buildingInstance, bytes24 outputItemID, uint64 qty) external;
}

contract ZoneKind is IZoneKind {
    function use(Game ds, bytes24 zoneID, bytes24 mobileUnitID, bytes calldata payload) external virtual {}
    function onUnitArrive(Game ds, bytes24 zoneID, bytes24 mobileUnitID) external virtual {}
    function onCombatStart(Game ds, bytes24 zoneID, bytes24 mobileUnitID, bytes24 sessionID) external virtual {}
    function onCombatJoin(Game ds, bytes24 zoneID, bytes24 mobileUnitID, bytes24 sessionID) external virtual {}
    function onCombatLeave(Game ds, bytes24 zoneID, bytes24 mobileUnitID, bytes24 sessionID) external virtual {}
    function onCombatFinalise(Game ds, bytes24 zoneID, bytes24 sessionId, CombatState memory combatState)
        external
        virtual
    {}
    function onTransferItem(
        Game ds,
        bytes24 zoneID,
        bytes24 actor,
        bytes24[2] memory equipee,
        uint8[2] memory equipSlot,
        uint8[2] memory itemSlot,
        bytes24 toBagId,
        uint64 qty
    ) external virtual {}
    function onContructBuilding(Game ds, bytes24 zoneID, bytes24 mobileUnitID, bytes24 buildingInstance)
        external
        virtual
    {}
    function onDestroyBuilding(Game ds, bytes24 zoneID, bytes24 buildingInstance, bytes24 buildingKind)
        external
        virtual
    {}
    function onAcceptQuest(Game ds, bytes24 zoneID, bytes24 quest, uint8 questNum, bytes24 player) external virtual {}
    function onCompleteQuest(Game ds, bytes24 zoneID, bytes24 quest, uint8 questNum, bytes24 player) external virtual {}
    function onExtract(Game ds, bytes24 zoneID, bytes24 player, bytes24 buildingInstance, bytes24 outputItemID, uint64 qty) external virtual {}
    function onCraft(Game ds, bytes24 zoneID, bytes24 player, bytes24 buildingInstance, bytes24 outputItemID, uint64 qty) external virtual {}
}

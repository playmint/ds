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
}

contract ZoneKind is IZoneKind {
    function use(Game ds, bytes24 zoneID, bytes24 mobileUnitID, bytes calldata payload) external virtual {}
    function onUnitArrive(Game ds, bytes24 zoneID, bytes24 mobileUnitID) external virtual {}
    function onCombatStart(Game ds, bytes24 zoneID, bytes24 mobileUnitID, bytes24 sessionID) external virtual {}
    function onCombatJoin(Game ds, bytes24 zoneID, bytes24 mobileUnitID, bytes24 sessionID) external virtual {}
    function onCombatLeave(Game ds, bytes24 zoneID, bytes24 mobileUnitID, bytes24 sessionID) external virtual {}
    function onCombatFinalise(Game ds, bytes24 zoneID, bytes24 sessionId, CombatState memory combatState) external virtual {}
}

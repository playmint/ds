// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "cog/IGame.sol";
import "cog/IState.sol";

interface IZoneKind {
    function use(Game ds, bytes24 zoneID, bytes24 mobileUnitID, bytes calldata payload) external;
    function onUnitArrive(Game ds, bytes24 zoneID, bytes24 mobileUnitID) external;
}

contract ZoneKind is IZoneKind {
    function use(Game ds, bytes24 zoneID, bytes24 mobileUnitID, bytes calldata payload) external virtual {}
    function onUnitArrive(Game ds, bytes24 zoneID, bytes24 mobileUnitID) external virtual {}
}

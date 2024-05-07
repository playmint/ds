// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "cog/IGame.sol";
import {IZoneKind} from "@ds/ext/ZoneKind.sol";

interface IHexcraftZone is IZoneKind {
    function use(Game ds, bytes24 zoneID, bytes24 mobileUnitID, bytes calldata payload) external;
    function resetWorld(Game ds, bytes24 buildingId) external;
}

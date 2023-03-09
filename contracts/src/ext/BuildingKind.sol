// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Game} from "cog/Game.sol";

interface BuildingKind {
    function use(Game ds, bytes24 buildingInstanceID, bytes24 seekerID, bytes memory payload) external;
}

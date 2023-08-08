// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Game} from "cog/IGame.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {BuildingKind} from "@ds/ext/BuildingKind.sol";
import {console} from "forge-std/console.sol";

contract PrimeEvil is BuildingKind {
    function use(Game ds, bytes24 buildingInstance, bytes24, /*mobileUnit*/ bytes calldata /*payload*/ ) public {}
}

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Game} from "cog/IGame.sol";
import {State} from "cog/IState.sol";
import {Schema} from "@ds/schema/Schema.sol";
import {ZoneKind} from "@ds/ext/ZoneKind.sol";

using Schema for State;

contract TestZone is ZoneKind {
    function onUnitArrive(Game ds, bytes24 buildingInstanceID, bytes24 mobileUnitID) override external {
    }
}
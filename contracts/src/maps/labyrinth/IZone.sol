// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "cog/IGame.sol";
import {IZoneKind} from "@ds/ext/ZoneKind.sol";

interface ILabyrinthZone is IZoneKind {
    function reset(Game ds, bytes24 originTile) external;
}

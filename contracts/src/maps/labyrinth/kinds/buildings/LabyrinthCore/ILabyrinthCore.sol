// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Game} from "cog/IGame.sol";

interface ILabyrinthCore {
    function reset(Game ds, bytes24 coreBuildingInstance) external;
}

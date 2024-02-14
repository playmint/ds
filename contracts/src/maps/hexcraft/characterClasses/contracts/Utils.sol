// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Game} from "cog/IGame.sol";
import {State} from "cog/IState.sol";
import {Schema} from "@ds/schema/Schema.sol";

using Schema for State;

bytes24 constant HEADQUARTER_BUILDING_KIND_ID = 0xbe92755c0000000000000000818eec0b0000000000000004;

interface Craftable {
    function setCrafted(bytes24 actor) external;
    function hasCrafted(bytes24 actor) external view returns (bool);
}

interface Headquarter {
    function isGameActive() external view returns (bool);
}

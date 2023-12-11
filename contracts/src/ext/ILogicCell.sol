// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {GooVal} from "@ds/schema/Schema.sol";
import {State} from "cog/IState.sol";

interface ILogicCell {
    function execute(State state, bytes24 logicCell, GooVal[] memory input) external returns (GooVal[] memory output);
}

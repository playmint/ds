// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Game} from "cog/IGame.sol";
import {State} from "cog/IState.sol";
import {Schema, GooVal} from "@ds/schema/Schema.sol";
import {BuildingKind} from "@ds/ext/BuildingKind.sol";
import {ILogicCell} from "@ds/ext/ILogicCell.sol";

using Schema for State;

contract Add is BuildingKind, ILogicCell {
    function use(Game ds, bytes24 buildingInstance, bytes24, /*actor*/ bytes memory /*payload*/ ) public {}

    function execute(State state, bytes24 logicCell, GooVal[] memory input) public returns (GooVal[] memory output) {
        require(input.length == 2, "add: Requires 2 inputs");

        output = new GooVal[](1);
        output[0] = GooVal({r: input[0].r + input[1].r, g: input[0].g + input[1].g, b: input[0].b + input[1].b});

        return output;
    }
}

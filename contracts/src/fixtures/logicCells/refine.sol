// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Game} from "cog/IGame.sol";
import {State} from "cog/IState.sol";
import {Schema, GooVal} from "@ds/schema/Schema.sol";
import {BuildingKind} from "@ds/ext/BuildingKind.sol";
import {ILogicCell} from "@ds/ext/ILogicCell.sol";

using Schema for State;

contract Refine is BuildingKind, ILogicCell {
    function use(Game ds, bytes24 buildingInstance, bytes24, /*actor*/ bytes memory /*payload*/ ) public {}

    function execute(State state, bytes24 logicCell, GooVal[] memory input) public returns (GooVal[] memory output) {
        require(input.length == 1, "refine: Requires 1 input1");

        output = new GooVal[](3);
        output[0] = GooVal({r: input[0].r, g: 0, b: 0});
        output[1] = GooVal({r: 0, g: input[0].g, b: 0});
        output[2] = GooVal({r: 0, g: 0, b: input[0].b});

        return output;
    }
}

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Game} from "cog/IGame.sol";
import {ItemKind} from "@ds/ext/ItemKind.sol";

contract Squircle is ItemKind {
    function onRegisterRecipeOutput(
        Game, /*ds*/
        bytes24, /*player*/
        bytes24, /*buildingKind*/
        bytes24[4] memory, /*inputItem*/
        uint64[4] memory, /*inputQty*/
        bytes24, /*outputItem*/
        uint64 /*outputQty*/
    ) public pure returns (bool) {
        return true;
    }
}

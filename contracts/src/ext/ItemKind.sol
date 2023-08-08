// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "cog/IGame.sol";

interface ItemKind {
    // called when someone attempts to use this item as a crafting
    // output return true to allow it, false to deny it
    function onRegisterRecipeOutput(
        Game ds,
        bytes24 player,
        bytes24 buildingKind,
        bytes24[4] memory inputItem,
        uint64[4] memory inputQty,
        bytes24 outputItem,
        uint64 outputQty
    ) external returns (bool);
}

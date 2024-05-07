// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Game} from "cog/IGame.sol";
import {ItemKind} from "@ds/ext/ItemKind.sol";

contract Squircle is ItemKind {
    function onCraft(
        Game /*ds*/,                    // game contract
        bytes24 /*player*/,             // player performing CRAFT
        bytes24 /*buildingInstanceID*/, // building instance CRAFTing occured
        bytes24 /*itemID*/,             // Squircle item id
        uint64 /*itemQty*/              // how many are getting crafted
    ) pure public override {
        // the base rule is to only allow the owner to craft, but here we
        // override the default to do no checking so anyone can craft this item
        return;
    }
}

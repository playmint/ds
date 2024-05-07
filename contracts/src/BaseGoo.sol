// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Game} from "cog/IGame.sol";
import {ItemKind} from "@ds/ext/ItemKind.sol";

contract BaseGoo is ItemKind {
    function onCraft(
        Game, /*ds*/ // game contract
        bytes24, /*player*/ // player performing CRAFT
        bytes24, /*buildingInstanceID*/ // building instance CRAFTing occured
        bytes24, /*itemID*/ // Squircle item id
        uint64 /*itemQty*/ // how many are getting crafted
    ) public pure override {
        // anyone is free to do whatever with the base goo
        return;
    }

    function onExtract(
        Game, /*ds*/ // game contract
        bytes24, /*player*/ // player performing EXTRACT
        bytes24, /*buildingInstanceID*/ // building instance extracting
        bytes24, /*itemID*/ // Squircle item id
        uint64 /*itemQty*/ // how many are getting crafted
    ) public pure override {
        // anyone is free to do whatever with the base goo
        return;
    }

    function onSpawn(Game ds, bytes24, /*player*/ bytes24, /*zoneID*/ bytes24, /*itemID*/ uint64 /*itemQty*/ )
        public
        pure
        override
    {
        // anyone is free to do whatever with the base goo
        return;
    }
}

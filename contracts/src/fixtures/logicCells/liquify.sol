// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Game} from "cog/IGame.sol";
import {State} from "cog/IState.sol";
import {Schema, GooVal, GOO_RED, GOO_GREEN, GOO_BLUE} from "@ds/schema/Schema.sol";
import {BuildingKind} from "@ds/ext/BuildingKind.sol";
import {ILogicCell} from "@ds/ext/ILogicCell.sol";

using Schema for State;

contract Liquify is BuildingKind, ILogicCell {
    function use(Game ds, bytes24 buildingInstance, bytes24, /*actor*/ bytes memory /*payload*/ ) public {}

    function execute(State state, bytes24 logicCell, GooVal[] memory input) public returns (GooVal[] memory output) {
        output = new GooVal[](1);

        bytes24 inBag = state.getEquipSlot(logicCell, 0);
        uint8 inItemSlot = 0;
        (bytes24 inItem, uint64 inItemQty) = state.getItemSlot(inBag, inItemSlot);

        require(inItemQty > 0, "Liquify: Requires an item as input");

        (uint32[3] memory atoms, /*bool outputStackable*/ ) = state.getItemStructure(inItem);

        state.setItemSlot(inBag, inItemSlot, inItem, inItemQty - 1);

        output[0] = GooVal({r: atoms[GOO_RED], g: atoms[GOO_GREEN], b: atoms[GOO_BLUE]});

        return output;
    }
}

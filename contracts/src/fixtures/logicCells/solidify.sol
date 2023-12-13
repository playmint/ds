// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Game} from "cog/IGame.sol";
import {State} from "cog/IState.sol";
import {Schema, GooVal, Rel, Node} from "@ds/schema/Schema.sol";
import {BuildingKind} from "@ds/ext/BuildingKind.sol";
import {ILogicCell} from "@ds/ext/ILogicCell.sol";

using Schema for State;

contract Solidify is BuildingKind, ILogicCell {
    function use(Game ds, bytes24 buildingInstance, bytes24, /*actor*/ bytes memory /*payload*/ ) public {}

    function execute(State state, bytes24 logicCell, GooVal[] memory input) public returns (GooVal[] memory output) {
        require(input.length == 1, "solidify: Requires 1 input");

        output = new GooVal[](0);

        if (input.length == 0) {
            return output;
        }

        // don't solidify zero value items
        if (uint32(input[0].g) == 0 && uint32(input[0].b) == 0 && uint32(input[0].r) == 0) {
            return output;
        }

        // NOTE: Always stackable
        bytes24 outputItem = Node.Item([uint32(input[0].g), uint32(input[0].b), uint32(input[0].r)], true);

        bytes24 outBag = state.getEquipSlot(logicCell, 1);
        uint8 outItemSlot = 0;

        // spawn the output item(s)
        {
            // check destination slot is either empty or is of same type
            (bytes24 existingOutputItem, uint64 existingOutputBalance) =
                state.get(Rel.Balance.selector, outItemSlot, outBag);
            if (existingOutputBalance > 0) {
                require(outputItem == existingOutputItem, "cannot stack output item: different item types");
                (, bool outputStackable) = state.getItemStructure(outputItem);
                require(outputStackable, "cannot stack output item: not a stackable item");
            }

            // update dest bag slot with item
            state.set(Rel.Balance.selector, outItemSlot, outBag, outputItem, existingOutputBalance + 1);
        }

        return output;
    }
}

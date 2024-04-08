// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Game} from "cog/IGame.sol";
import {State} from "cog/IState.sol";
import {Schema} from "@ds/schema/Schema.sol";

using Schema for State;

bytes24 constant CRAFTING_HAMMER_ITEM_ID = 0x6a7a67f00181bf3a000000010000000f0000000f0000000f;
bytes24 constant HEADQUARTER_BUILDING_ID = 0x34cf8a7e00000000000000000000000000000001ffff0000;

function getItemSlot(State state, bytes24 actor, bytes24 item) view returns (bytes24, uint8, uint64) {
    for (uint8 bagIndex = 0; bagIndex < 2; bagIndex++) {
        bytes24 bag = state.getEquipSlot(actor, bagIndex);
        if (bag != 0) {
            for (uint8 slot = 0; slot < 4; slot++) {
                (bytes24 resource, uint64 balance) = state.getItemSlot(bag, slot);
                if (resource == item && balance > 0) {
                    return (bag, slot, balance);
                }
            }
        }
    }
    return (0, 0, 0);
}

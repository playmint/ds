// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Game} from "cog/IGame.sol";
import {State} from "cog/IState.sol";
import {Schema} from "@ds/schema/Schema.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {BuildingKind} from "@ds/ext/BuildingKind.sol";

import "./Utils.sol";

using Schema for State;

contract BasicFactory is BuildingKind {
    function use(Game ds, bytes24 buildingInstance, bytes24, /*actor*/ bytes memory /*payload*/ ) public override {
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.CRAFT, (buildingInstance)));
    }

    function construct(Game ds, bytes24, /*buildingInstance*/ bytes24 actor, bytes memory /*payload*/ )
        public
        override
    {
        State state = ds.getState();

        (bytes24 bag, uint8 slot, uint64 balance) = getItemSlot(state, actor, CRAFTING_HAMMER_ITEM_ID);
        require((bag != 0), "you need a crafting hammer to construct this building");

        uint64 newBalance = balance - 1;
        if (newBalance == 0) {
            state.clearItemSlot(bag, slot);
        } else {
            state.setItemSlot(bag, slot, CRAFTING_HAMMER_ITEM_ID, newBalance);
        }
    }
}

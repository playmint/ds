// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Game} from "cog/IGame.sol";
import {State} from "cog/IState.sol";
import {Schema} from "@ds/schema/Schema.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {BuildingKind} from "@ds/ext/BuildingKind.sol";

import "./Utils.sol";

using Schema for State;

contract FightersArena is BuildingKind {
    function use(Game ds, bytes24 buildingInstance, bytes24 actor, bytes memory /*payload*/ ) public override {
        State state = ds.getState();
        Craftable hq = Craftable(state.getImplementation(HEADQUARTER_BUILDING_KIND_ID));

        // check already crafted
        require(!hq.hasCrafted(actor), "already crafted");

        // mark as crafted
        hq.setCrafted(actor);

        ds.getDispatcher().dispatch(abi.encodeCall(Actions.CRAFT, (buildingInstance)));
    }
}

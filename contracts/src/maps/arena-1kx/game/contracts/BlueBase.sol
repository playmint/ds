// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Game} from "cog/IGame.sol";
import {State} from "cog/IState.sol";
import {Schema} from "@ds/schema/Schema.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {BuildingKind} from "@ds/ext/BuildingKind.sol";

using Schema for State;

import "./Utils.sol";

contract BlueBase is BuildingKind {
    function use(Game ds, bytes24 buildingInstance, bytes24, /*actor*/ bytes memory /*payload*/ ) override public {
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.CRAFT, (buildingInstance)));
    }

    function construct(Game ds, bytes24 /*buildingInstance*/, bytes24 /*actor*/, bytes memory /*payload*/ ) override public {

        State state = ds.getState();
        Headquarter hq = Headquarter(state.getImplementation(HEADQUARTER_BUILDING_KIND_ID));

        // check already crafted
        require(!hq.isGameActive(), "game already started");
    }
}

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Game} from "cog/IGame.sol";
import {State} from "cog/IState.sol";
import {Schema, Kind} from "@ds/schema/Schema.sol";
import {Actions, FacingDirectionKind} from "@ds/actions/Actions.sol";
import {BuildingKind} from "@ds/ext/BuildingKind.sol";
import {ILabyrinthCore} from "./ILabyrinthCore.sol";

using Schema for State;

contract LabyrinthCore is ILabyrinthCore, BuildingKind {
    function use(Game ds, bytes24 buildingInstance, bytes24, /*actor*/ bytes memory /*payload*/ ) public override {
        // Crafting the Playtest Pass
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.CRAFT, (buildingInstance)));
        // doReset(ds, buildingInstance);
    }
}

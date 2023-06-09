// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Game} from "cog/Game.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {BuildingKind} from "@ds/ext/BuildingKind.sol";
import {console} from "forge-std/console.sol";

contract AllThingsRubber is BuildingKind {

    function use(Game ds, bytes24 buildingInstance, bytes24, /*seeker*/ bytes calldata /*payload*/) public {

        ds.getDispatcher().dispatch(abi.encodeCall(Actions.CRAFT, (buildingInstance)));

    }
}

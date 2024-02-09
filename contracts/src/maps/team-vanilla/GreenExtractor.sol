// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Game} from "cog/IGame.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {BuildingKind} from "@ds/ext/BuildingKind.sol";

contract GreenExtractor is BuildingKind {
    function use(Game ds, bytes24 buildingInstance, bytes24, /*actor*/ bytes memory /*payload*/ ) public override {
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.EXTRACT, (buildingInstance)));
    }
}

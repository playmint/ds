// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Game} from "cog/IGame.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {BuildingKind} from "@ds/ext/BuildingKind.sol";

contract CocktailHut is BuildingKind {
    function use(Game ds, bytes24 buildingInstance, bytes24, /*actor*/ bytes memory /*payload*/ ) override public {
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.CRAFT, (buildingInstance)));
    }
    // function construct(Game ds, bytes24 buildingInstance, bytes24, /*actor*/ bytes memory /*payload*/ ) override public {
    //     // prevent construction
    //     require(false, "computer says no");
    // }
}

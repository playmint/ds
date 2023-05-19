// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Game} from "cog/Game.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {BuildingKind} from "@ds/ext/BuildingKind.sol";

contract DummyBuilding is BuildingKind {
    mapping(bytes24 => bool) claimed;

    function use(Game ds, bytes24 buildingInstance, bytes24 actor, bytes memory /*payload*/ ) public {

        require(!claimed[actor], "already claimed");
        claimed[actor] = true;

        ds.getDispatcher().dispatch(
            abi.encodeCall(Actions.CRAFT, (buildingInstance))
        );
    }
}

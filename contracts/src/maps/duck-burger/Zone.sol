// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {ZoneKind} from "@ds/ext/ZoneKind.sol";
import {IDuckBurgerZone} from "./IZone.sol";
import {Game} from "cog/IGame.sol";
import {State} from "cog/IState.sol";
import {Schema, Node} from "@ds/schema/Schema.sol";
import {Actions, FacingDirectionKind} from "@ds/actions/Actions.sol";

using Schema for State;

contract DuckBurgerZone is ZoneKind, IDuckBurgerZone {
    // See labyrinth for reset example

    function reset(Game ds, bytes24 originTile) public {
    }

    function _reset(Game ds, int16 z, int16 q, int16 r, int16 s) internal {
    }
}

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Game} from "cog/IGame.sol";
import {Dispatcher} from "cog/IDispatcher.sol";
import {State} from "cog/IState.sol";
import {Schema, Kind, Node} from "@ds/schema/Schema.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {BuildingKind} from "@ds/ext/BuildingKind.sol";
import {PasswordFactory} from "PasswordFactory.sol";

using Schema for State;

contract BlacksmithSecrets is PasswordFactory {
    function getPasswordHash() internal pure override returns (bytes32) {
        return 0xff8d5aaef5d1f2352a0f17f117cd167af228542216099f0212c11fd78377f61b;
    }
}

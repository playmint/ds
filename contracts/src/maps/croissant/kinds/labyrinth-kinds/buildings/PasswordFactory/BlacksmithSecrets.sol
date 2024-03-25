// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Game} from "cog/IGame.sol";
import {Dispatcher} from "cog/IDispatcher.sol";
import {State} from "cog/IState.sol";
import {Schema, Kind, Node} from "@ds/schema/Schema.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {BuildingKind} from "@ds/ext/BuildingKind.sol";
import {PasswordFactory} from "./PasswordFactory.sol";

using Schema for State;

contract BlacksmithSecrets is PasswordFactory {
    function getPasswordHash() internal pure override returns (bytes32) {
        return 0xb4f7998b245301fa1dfc784b03961989df486af3dd1e44f88da79ca40cf5125f;
    }
}

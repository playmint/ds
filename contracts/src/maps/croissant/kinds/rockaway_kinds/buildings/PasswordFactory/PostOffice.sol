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

contract PostOffice is PasswordFactory {
    function getPasswordHash() internal pure override returns (bytes32) {
        return 0xa51829b58a075004903a8c801dfce8691791cdff453000da89f3e420869759cc;
    }
}

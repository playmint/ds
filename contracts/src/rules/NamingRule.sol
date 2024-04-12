// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "cog/IState.sol";
import "cog/IRule.sol";
import "cog/IDispatcher.sol";

import {Schema, Node, Kind} from "@ds/schema/Schema.sol";
import {TileUtils} from "@ds/utils/TileUtils.sol";
import {ItemUtils} from "@ds/utils/ItemUtils.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {BuildingKind} from "@ds/ext/BuildingKind.sol";
import {CraftingRule} from "@ds/rules/CraftingRule.sol";

using Schema for State;

contract NamingRule is Rule {
    constructor() {}

    function reduce(State state, bytes calldata action, Context calldata ctx) public returns (State) {
        if (bytes4(action) == Actions.NAME_OWNED_ENTITY.selector) {
            (bytes24 entity, string memory name) = abi.decode(action[4:], (bytes24, string));
            _changeEntityName(state, Node.Player(ctx.sender), entity, name);
        } else if (bytes4(action) == Actions.DESCRIBE_OWNED_ENTITY.selector) {
            (bytes24 entity, string memory desc) = abi.decode(action[4:], (bytes24, string));
            _changeEntityDescription(state, Node.Player(ctx.sender), entity, desc);
        } else if (bytes4(action) == Actions.URL_OWNED_ENTITY.selector) {
            (bytes24 entity, string memory url) = abi.decode(action[4:], (bytes24, string));
            _changeEntityURL(state, Node.Player(ctx.sender), entity, url);
        }
        return state;
    }

    function _changeEntityName(State state, bytes24 player, bytes24 entity, string memory name) private {
        require(bytes(name).length <= 31, "Name exceeds 31 characters");

        bytes24 existingOwner = state.getOwner(entity);
        if (existingOwner != 0x0 && existingOwner != player) {
            revert("EntityNotOwnedByPlayer");
        }
        state.setData(entity, "name", bytes32(bytes(name)));
        state.annotate(entity, "name", name);
    }

    function _changeEntityDescription(State state, bytes24 player, bytes24 entity, string memory desc) private {
        require(bytes(desc).length <= 140, "Description exceeds 140 characters");

        bytes24 existingOwner = state.getOwner(entity);
        if (existingOwner != 0x0 && existingOwner != player) {
            revert("EntityNotOwnedByPlayer");
        }

        state.annotate(entity, "description", desc);
    }

    function _changeEntityURL(State state, bytes24 player, bytes24 entity, string memory url) private {
        require(bytes(url).length <= 140, "url exceeds 140 characters");

        bytes24 existingOwner = state.getOwner(entity);
        if (existingOwner != 0x0 && existingOwner != player) {
            revert("EntityNotOwnedByPlayer");
        }
        state.annotate(entity, "url", url);
    }
}

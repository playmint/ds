// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {State} from "cog/State.sol";
import {Context, Rule} from "cog/Dispatcher.sol";
import {Context, Rule} from "cog/Dispatcher.sol";

import {
    Schema, Node, Kind, BiomeKind, ResourceKind, TileUtils, TRAVEL_SPEED, DEFAULT_ZONE
} from "@ds/schema/Schema.sol";
import {Actions} from "@ds/actions/Actions.sol";

error PluginNotOwner();
error PluginNotBuildingKindOwner();

uint64 constant BUILDING_COST = 100;

using Schema for State;

contract PluginRule is Rule {
    function reduce(State state, bytes calldata action, Context calldata ctx) public returns (State) {
        if (bytes4(action) == Actions.REGISTER_CLIENT_PLUGIN.selector) {
            (bytes24 plugin, string memory metadata) = abi.decode(action[4:], (bytes24, string));
            bytes24 owner = state.getOwner(plugin);
            if (owner != 0x0 && owner != Node.Player(ctx.sender)) {
                revert PluginNotOwner();
            }
            state.setOwner(plugin, Node.Player(ctx.sender));
            state.annotate(plugin, "metadata", metadata);
        } else if (bytes4(action) == Actions.REGISTER_BUILDING_PLUGIN.selector) {
            (bytes24 buildingKind, bytes24 plugin, string memory metadata) =
                abi.decode(action[4:], (bytes24, bytes24, string));
            bytes24 owner = state.getOwner(buildingKind);
            if (owner == 0x0 || owner != Node.Player(ctx.sender)) {
                revert PluginNotBuildingKindOwner();
            }
            state.setOwner(plugin, Node.Player(ctx.sender));
            state.setPlugin(buildingKind, plugin, metadata);
        }

        return state;
    }
}

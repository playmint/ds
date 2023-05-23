// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {State} from "cog/State.sol";
import {Context, Rule} from "cog/Dispatcher.sol";
import {Context, Rule} from "cog/Dispatcher.sol";

import {Schema, Node} from "@ds/schema/Schema.sol";
import {Actions} from "@ds/actions/Actions.sol";

error PluginNotPluginOwner();
error PluginNotTargetOwner();

uint64 constant BUILDING_COST = 100;

using Schema for State;

contract PluginRule is Rule {
    function reduce(State state, bytes calldata action, Context calldata ctx) public returns (State) {
        if (bytes4(action) == Actions.REGISTER_KIND_PLUGIN.selector) {
            // decode the payload
            (bytes24 plugin, bytes24 target, string memory name, string memory src) =
                abi.decode(action[4:], (bytes24, bytes24, string, string));

            bytes24 player = Node.Player(ctx.sender);

            // if someone has already registered this plugin id, then only allow that owner to update it
            bytes24 pluginOwner = state.getOwner(plugin);
            if (pluginOwner != 0x0 && pluginOwner != player) {
                revert PluginNotPluginOwner();
            }

            // we only allow setting plugins that target nodes that you own
            // for example you can only set a BuildingKind plugin if you own the BuildingKind
            // we may lift this restriction if it makes sense
            bytes24 targetOwner = state.getOwner(target);
            if (targetOwner != 0x0 && targetOwner != player) {
                revert PluginNotTargetOwner();
            }

            // we only support a plugin referencing a single thing right now
            // but there is no reason why one plugin could not reference an interest
            // in multiple things by allowing setting the edge key
            state.setPlugin(plugin, target);

            // sender owns the plugin for future updates
            state.setOwner(plugin, player);

            // set plugin metadata as annotations
            // for now the offical client only supports src as a blob of javascript
            // and a friendly name
            state.annotate(plugin, "name", name);
            state.annotate(plugin, "src", src);
        } else if (bytes4(action) == Actions.REGISTER_KIND_IMPLEMENTATION.selector) {
            (bytes24 kind, address contractAddr) = abi.decode(action[4:], (bytes24, address));
            _registerImplementation(state, Node.Player(ctx.sender), kind, contractAddr);
        }

        return state;
    }

    function _registerImplementation(State state, bytes24 player, bytes24 kind, address contractAddr)
        private
    {
        bytes24 owner = state.getOwner(kind);
        if (owner != player) {
            revert PluginNotTargetOwner();
        }
        state.setImplementation(kind, contractAddr);
    }

}

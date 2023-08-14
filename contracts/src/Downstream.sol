// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "cog/BaseRouter.sol";
import "cog/BaseDispatcher.sol";
import "cog/BaseState.sol";
import "cog/BaseGame.sol";
import {LibString} from "cog/utils/LibString.sol";

import "./IDownstream.sol";
import {Schema, Node, Rel, Kind} from "@ds/schema/Schema.sol";
import {ItemUtils} from "@ds/utils/ItemUtils.sol";
import {CheatsRule} from "@ds/rules/CheatsRule.sol";
import {MovementRule} from "@ds/rules/MovementRule.sol";
import {ScoutRule} from "@ds/rules/ScoutRule.sol";
import {InventoryRule} from "@ds/rules/InventoryRule.sol";
import {BuildingRule} from "@ds/rules/BuildingRule.sol";
import {CraftingRule} from "@ds/rules/CraftingRule.sol";
import {PluginRule} from "@ds/rules/PluginRule.sol";
import {NewPlayerRule} from "@ds/rules/NewPlayerRule.sol";
import {CombatRule} from "@ds/rules/CombatRule.sol";
import {NamingRule} from "@ds/rules/NamingRule.sol";
import {BagRule} from "@ds/rules/BagRule.sol";
import {Actions} from "@ds/actions/Actions.sol";

using Schema for BaseState;

// -----------------------------------------------
// a Game sets up the State, Dispatcher and Router
//
// it sets up the rules our game uses and exposes
// the Game interface for discovery by cog-services
//
// we are using BasicGame to handle the boilerplate
// so all we need to do here is call registerRule()
// -----------------------------------------------

contract DownstreamRouter is BaseRouter {
    function getAuthMessage(uint32 ttl, uint32, /*scopes*/ address sessionAddr)
        internal
        pure
        virtual
        override
        returns (bytes memory)
    {
        return abi.encodePacked(
            "Welcome to Downstream!",
            "\n\nThis site is requesting permission to interact with your Downstream assets.",
            "\n\nSigning this message will not incur any fees.",
            "\n\nYou can revoke sessions and read more about them at https://downstream.com/sessions",
            "\n\nPermissions: send-actions, spend-energy",
            "\n\nValid: ",
            LibString.toString(ttl),
            " blocks",
            "\n\nSession: ",
            LibString.toHexString(sessionAddr)
        );
    }
}

contract DownstreamGame is BaseGame {
    NewPlayerRule playerRule;

    constructor(address authorizedCheater, address[] memory allowlist) BaseGame("DOWNSTREAM", "http://downstream.game/") {
        // create a state
        BaseState state = new BaseState();

        // register the kind ids we are using
        state.registerNodeType(Kind.Player.selector, "Player", CompoundKeyKind.ADDRESS);
        state.registerNodeType(Kind.MobileUnit.selector, "MobileUnit", CompoundKeyKind.UINT160);
        state.registerNodeType(Kind.Bag.selector, "Bag", CompoundKeyKind.UINT160);
        state.registerNodeType(Kind.Tile.selector, "Tile", CompoundKeyKind.INT16_ARRAY);
        state.registerNodeType(Kind.Item.selector, "Item", CompoundKeyKind.STRING);
        state.registerNodeType(Kind.BuildingKind.selector, "BuildingKind", CompoundKeyKind.UINT160);
        state.registerNodeType(Kind.Building.selector, "Building", CompoundKeyKind.INT16_ARRAY);
        state.registerNodeType(Kind.Extension.selector, "Extension", CompoundKeyKind.ADDRESS);
        state.registerNodeType(Kind.ClientPlugin.selector, "ClientPlugin", CompoundKeyKind.UINT160);
        state.registerNodeType(Kind.CombatSession.selector, "CombatSession", CompoundKeyKind.UINT160);
        state.registerNodeType(Kind.Hash.selector, "Hash", CompoundKeyKind.BYTES);
        state.registerNodeType(Kind.Atom.selector, "Atom", CompoundKeyKind.UINT160);

        // register the relationship ids we are using
        state.registerEdgeType(Rel.Owner.selector, "Owner", WeightKind.UINT64);
        state.registerEdgeType(Rel.Location.selector, "Location", WeightKind.UINT64);
        state.registerEdgeType(Rel.Balance.selector, "Balance", WeightKind.UINT64);
        state.registerEdgeType(Rel.Input.selector, "Input", WeightKind.UINT64);
        state.registerEdgeType(Rel.Output.selector, "Output", WeightKind.UINT64);
        state.registerEdgeType(Rel.Material.selector, "Material", WeightKind.UINT64);
        state.registerEdgeType(Rel.Biome.selector, "Biome", WeightKind.UINT64);
        state.registerEdgeType(Rel.Equip.selector, "Equip", WeightKind.UINT64);
        state.registerEdgeType(Rel.Is.selector, "Is", WeightKind.UINT64);
        state.registerEdgeType(Rel.Implementation.selector, "Implementation", WeightKind.UINT64);
        state.registerEdgeType(Rel.Supports.selector, "Supports", WeightKind.UINT64);
        state.registerEdgeType(Rel.Has.selector, "Has", WeightKind.UINT64);
        state.registerEdgeType(Rel.Combat.selector, "Combat", WeightKind.UINT64);
        state.registerEdgeType(Rel.IsFinalised.selector, "IsFinalised", WeightKind.UINT64);

        // create a session router
        BaseRouter router = new DownstreamRouter();

        // setup the player rule with allowlist
        playerRule = new NewPlayerRule(allowlist);

        // configure our dispatcher with state, rules and trust the router
        BaseDispatcher dispatcher = new BaseDispatcher();
        dispatcher.registerState(state);
        dispatcher.registerRule(new CheatsRule(authorizedCheater));
        dispatcher.registerRule(new MovementRule());
        dispatcher.registerRule(new ScoutRule());
        dispatcher.registerRule(new InventoryRule());
        dispatcher.registerRule(new BuildingRule(this));
        dispatcher.registerRule(new CraftingRule(this));
        dispatcher.registerRule(new PluginRule());
        dispatcher.registerRule(playerRule);
        dispatcher.registerRule(new CombatRule());
        dispatcher.registerRule(new NamingRule());
        dispatcher.registerRule(new BagRule());
        dispatcher.registerRouter(router);

        // update the game with this config
        _registerState(state);
        _registerRouter(router);
        _registerDispatcher(dispatcher);

        // register base resources used by temp scouting
        dispatcher.dispatch(
            abi.encodeCall(Actions.REGISTER_ITEM_KIND, (ItemUtils.GlassGreenGoo(), "Glass of Green Goo", "22-27"))
        );
        dispatcher.dispatch(
            abi.encodeCall(Actions.REGISTER_ITEM_KIND, (ItemUtils.BeakerBlueGoo(), "Beaker of Blue Goo", "22-142"))
        );
        dispatcher.dispatch(
            abi.encodeCall(Actions.REGISTER_ITEM_KIND, (ItemUtils.FlaskRedGoo(), "Flask of Red Goo", "22-24"))
        );
    }

    function allow(address addr) public {
        playerRule.allow(addr);
    }
}

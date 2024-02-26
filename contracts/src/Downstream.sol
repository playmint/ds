// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "cog/BaseRouter.sol";
import "cog/BaseDispatcher.sol";
import "cog/BaseState.sol";
import "cog/BaseGame.sol";
import {LibString} from "cog/utils/LibString.sol";

import "./IDownstream.sol";
import {Schema, Node, Rel, Kind} from "@ds/schema/Schema.sol";
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
    constructor() BaseGame("DOWNSTREAM", "http://downstream.game/") {
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
        state.registerNodeType(Kind.BlockNum.selector, "BlockNum", CompoundKeyKind.UINT160);
        state.registerNodeType(Kind.Quest.selector, "Quest", CompoundKeyKind.UINT160);
        state.registerNodeType(Kind.Task.selector, "Task", CompoundKeyKind.UINT32_ARRAY);
        state.registerNodeType(Kind.ID.selector, "ID", CompoundKeyKind.BYTES);
        state.registerNodeType(Kind.OwnedToken.selector, "OwnedToken", CompoundKeyKind.BYTES);

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
        state.registerEdgeType(Rel.CombatAttacker.selector, "CombatAttacker", WeightKind.UINT64);
        state.registerEdgeType(Rel.CombatDefender.selector, "CombatDefender", WeightKind.UINT64);
        state.registerEdgeType(Rel.IsFinalised.selector, "IsFinalised", WeightKind.UINT64);
        state.registerEdgeType(Rel.HasQuest.selector, "HasQuest", WeightKind.UINT64);
        state.registerEdgeType(Rel.HasTask.selector, "HasTask", WeightKind.UINT64);
        state.registerEdgeType(Rel.ID.selector, "ID", WeightKind.UINT64);
        state.registerEdgeType(Rel.HasBlockNum.selector, "HasBlockNum", WeightKind.UINT64);

        // create a session router
        BaseRouter router = new DownstreamRouter();

        // configure our dispatcher with state
        BaseDispatcher dispatcher = new BaseDispatcher();
        dispatcher.registerState(state);
        dispatcher.registerRouter(router);

        // update the game with this config
        _registerState(state);
        _registerRouter(router);
        _registerDispatcher(dispatcher);
    }
}

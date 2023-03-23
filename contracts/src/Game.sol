// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {CompoundKeyKind, WeightKind} from "cog/State.sol";
import {SessionRouter} from "cog/SessionRouter.sol";

import {BaseDispatcher} from "cog/Dispatcher.sol";
import {StateGraph} from "cog/StateGraph.sol";
import {BaseGame} from "cog/Game.sol";
import {LibString} from "cog/utils/LibString.sol";

import {Schema, Node, Rel, Kind, BiomeKind, ResourceKind, AtomKind} from "@ds/schema/Schema.sol";
import {CheatsRule} from "@ds/rules/CheatsRule.sol";
import {MovementRule} from "@ds/rules/MovementRule.sol";
import {ScoutRule} from "@ds/rules/ScoutRule.sol";
import {InventoryRule} from "@ds/rules/InventoryRule.sol";
import {BuildingRule} from "@ds/rules/BuildingRule.sol";
import {CraftingRule} from "@ds/rules/CraftingRule.sol";
import {PluginRule} from "@ds/rules/PluginRule.sol";
import {NewPlayerRule} from "@ds/rules/NewPlayerRule.sol";
import {Actions} from "@ds/actions/Actions.sol";

import {DummyBuilding} from "@ds/fixtures/DummyBuilding.sol";

using Schema for StateGraph;

// -----------------------------------------------
// a Game sets up the State, Dispatcher and Router
//
// it sets up the rules our game uses and exposes
// the Game interface for discovery by cog-services
//
// we are using BasicGame to handle the boilerplate
// so all we need to do here is call registerRule()
// -----------------------------------------------

contract DawnseekersRouter is SessionRouter {
    function getAuthMessage(uint32 ttl, uint32, /*scopes*/ address sessionAddr)
        internal
        pure
        virtual
        override
        returns (bytes memory)
    {
        return abi.encodePacked(
            "Welcome to Dawnseekers!",
            "\n\nThis site is requesting permission to interact with your Dawnseekers assets.",
            "\n\nSigning this message will not incur any fees.",
            "\n\nYou can revoke sessions and read more about them at https://dawnseekers.com/sessions",
            "\n\nPermissions: send-actions, spend-energy",
            "\n\nValid: ",
            LibString.toString(ttl),
            " blocks",
            "\n\nSession: ",
            LibString.toHexString(sessionAddr)
        );
    }
}

contract Game is BaseGame {
    constructor() BaseGame("DAWNSEEKERS", "http://dawnseekers.com/") {
        // create a state
        StateGraph state = new StateGraph();

        // register the kind ids we are using
        state.registerNodeType(Kind.Player.selector, "Player", CompoundKeyKind.ADDRESS);
        state.registerNodeType(Kind.Seeker.selector, "Seeker", CompoundKeyKind.UINT160);
        state.registerNodeType(Kind.Bag.selector, "Bag", CompoundKeyKind.UINT160);
        state.registerNodeType(Kind.Tile.selector, "Tile", CompoundKeyKind.INT16_ARRAY);
        state.registerNodeType(Kind.Resource.selector, "Resource", CompoundKeyKind.UINT160);
        state.registerNodeType(Kind.Atom.selector, "Atom", CompoundKeyKind.UINT160);
        state.registerNodeType(Kind.Item.selector, "Item", CompoundKeyKind.STRING);
        state.registerNodeType(Kind.BuildingKind.selector, "BuildingKind", CompoundKeyKind.UINT160);
        state.registerNodeType(Kind.Building.selector, "Building", CompoundKeyKind.INT16_ARRAY);
        state.registerNodeType(Kind.Extension.selector, "Extension", CompoundKeyKind.ADDRESS);
        state.registerNodeType(Kind.ClientPlugin.selector, "ClientPlugin", CompoundKeyKind.UINT160);

        // register the relationship ids we are using
        state.registerEdgeType(Rel.Owner.selector, "Owner", WeightKind.UINT64);
        state.registerEdgeType(Rel.Location.selector, "Location", WeightKind.UINT64);
        state.registerEdgeType(Rel.Balance.selector, "Balance", WeightKind.UINT64);
        state.registerEdgeType(Rel.Biome.selector, "Biome", WeightKind.UINT64);
        state.registerEdgeType(Rel.Equip.selector, "Equip", WeightKind.UINT64);
        state.registerEdgeType(Rel.Is.selector, "Is", WeightKind.UINT64);
        state.registerEdgeType(Rel.Implementation.selector, "Implementation", WeightKind.UINT64);
        state.registerEdgeType(Rel.Supports.selector, "Supports", WeightKind.UINT64);

        // create a session router
        SessionRouter router = new DawnseekersRouter();

        // configure our dispatcher with state, rules and trust the router
        BaseDispatcher dispatcher = new BaseDispatcher();
        dispatcher.registerState(state);
        dispatcher.registerRule(new CheatsRule());
        dispatcher.registerRule(new MovementRule());
        dispatcher.registerRule(new ScoutRule());
        dispatcher.registerRule(new InventoryRule());
        dispatcher.registerRule(new BuildingRule(this));
        dispatcher.registerRule(new CraftingRule());
        dispatcher.registerRule(new PluginRule());
        dispatcher.registerRule(new NewPlayerRule());
        dispatcher.registerRouter(router);

        // update the game with this config
        _registerState(state);
        _registerRouter(router);
        _registerDispatcher(dispatcher);

        // register resources
        uint64[] memory numAtoms = new uint64[](1);
        numAtoms[0] = 2;
        AtomKind[] memory atomKinds = new AtomKind[](1);

        atomKinds[0] = AtomKind.LIFE;
        dispatcher.dispatch(abi.encodeCall(Actions.REGISTER_RESOURCE_KIND, (ResourceKind.WOOD, atomKinds, numAtoms)));
        atomKinds[0] = AtomKind.DEF;
        dispatcher.dispatch(abi.encodeCall(Actions.REGISTER_RESOURCE_KIND, (ResourceKind.STONE, atomKinds, numAtoms)));
        atomKinds[0] = AtomKind.ATK;
        dispatcher.dispatch(abi.encodeCall(Actions.REGISTER_RESOURCE_KIND, (ResourceKind.IRON, atomKinds, numAtoms)));

        // [TMP] init some stuff to get started...

        // discover tile 0,0,0
        dispatcher.dispatch(
            abi.encodeCall(
                Actions.DEV_SPAWN_TILE,
                (
                    BiomeKind.DISCOVERED,
                    0, // q
                    0, // r
                    0 // s
                )
            )
        );

        // dump a seeker at that tile
        dispatcher.dispatch(
            abi.encodeCall(
                Actions.DEV_SPAWN_SEEKER,
                (
                    address(0), // owner
                    0, // seeker id (sid)
                    0, // q
                    0, // r
                    0 // s
                )
            )
        );

        // deploy and register the DummyBuilding as a building kind
        bytes24 dummyBuildingKind = Node.BuildingKind(1);
        dispatcher.dispatch(abi.encodeCall(Actions.REGISTER_BUILDING_KIND, (dummyBuildingKind, "DummyBuilding")));
        dispatcher.dispatch(
            abi.encodeCall(Actions.REGISTER_BUILDING_CONTRACT, (dummyBuildingKind, address(new DummyBuilding())))
        );
        dispatcher.dispatch(
            abi.encodeCall(
                Actions.REGISTER_CLIENT_PLUGIN, (Node.ClientPlugin(1), dummyBuildingKind, "DummyBuildingPlugin", "{}")
            )
        );
    }
}

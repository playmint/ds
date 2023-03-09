// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";

import {State, AnnotationKind} from "cog/State.sol";
import {Dispatcher} from "cog/Dispatcher.sol";

import {Game} from "@ds/Game.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {Schema, Node, Rel, DEFAULT_ZONE} from "@ds/schema/Schema.sol";

using Schema for State;

contract PluginRuleTest is Test {
    event AnnotationSet(bytes24 id, AnnotationKind kind, string label, bytes32 ref, string data);

    Game internal game;
    Dispatcher internal dispatcher;
    State internal state;

    // accounts
    address aliceAccount;

    function setUp() public {
        // setup game
        game = new Game();
        dispatcher = game.getDispatcher();

        // fetch the State to play with
        state = game.getState();

        // setup users
        uint256 alicePrivateKey = 0xA11CE;
        aliceAccount = vm.addr(alicePrivateKey);
    }

    function testRegisterClientPlugin() public {
        bytes24 pluginID = Node.ClientPlugin(10);
        string memory pluginData = '{"meta": "data"}';
        // expect plugin metadata emitted
        vm.expectEmit(true, true, true, true, address(state));
        emit AnnotationSet(pluginID, AnnotationKind.CALLDATA, "metadata", keccak256(bytes(pluginData)), pluginData);
        // register a generic plugin
        dispatcher.dispatch(abi.encodeCall(Actions.REGISTER_CLIENT_PLUGIN, (pluginID, pluginData)));
    }

    function testRegisterBuildingKindPlugin() public {
        // register a building kind
        vm.startPrank(aliceAccount);
        bytes24 buildingKind = Node.BuildingKind(10);
        dispatcher.dispatch(abi.encodeCall(Actions.REGISTER_BUILDING_KIND, (buildingKind, "hut")));
        vm.stopPrank();
        // register a generic plugin for the kind
        bytes24 pluginID = Node.ClientPlugin(20);
        string memory pluginData = '{"meta": "data"}';
        vm.startPrank(aliceAccount);
        // expect plugin metadata emitted
        vm.expectEmit(true, true, true, true, address(state));
        emit AnnotationSet(pluginID, AnnotationKind.CALLDATA, "metadata", keccak256(bytes(pluginData)), pluginData);
        dispatcher.dispatch(abi.encodeCall(Actions.REGISTER_BUILDING_PLUGIN, (buildingKind, pluginID, pluginData)));
        vm.stopPrank();
        // check building kind assigned to plugin
        assertEq(state.getPlugin(buildingKind), pluginID, "expected building kind to reference plugin");
    }
}

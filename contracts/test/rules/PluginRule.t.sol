// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";

import {State, AnnotationKind} from "cog/State.sol";
import {Dispatcher} from "cog/Dispatcher.sol";

import {Game} from "@ds/Game.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {Schema, Node, Rel, DEFAULT_ZONE} from "@ds/schema/Schema.sol";
import {ItemUtils} from "@ds/utils/ItemUtils.sol";
import "@ds/rules/PluginRule.sol";

using Schema for State;

contract PluginRuleTest is Test {
    event AnnotationSet(bytes24 id, AnnotationKind kind, string label, bytes32 ref, string data);

    Game internal game;
    Dispatcher internal dispatcher;
    State internal state;

    // accounts
    address aliceAccount;
    address bobAccount;

    function setUp() public {
        // setup users
        uint256 alicePrivateKey = 0xA11CE;
        aliceAccount = vm.addr(alicePrivateKey);
        uint256 bobPrivateKey = 0xB0B0B;
        bobAccount = vm.addr(bobPrivateKey);

        // setup allowlist
        address[] memory allowlist = new address[](2);
        allowlist[0] = aliceAccount;
        allowlist[1] = bobAccount;

        // setup game
        game = new Game(allowlist);
        dispatcher = game.getDispatcher();

        // fetch the State to play with
        state = game.getState();
    }

    function testRegisterClientPlugin() public {
        bytes24 pluginID = Node.ClientPlugin(10);
        string memory pluginName = "generic-plugin";
        string memory pluginSrc = "function(){}";
        // expect plugin metadata emitted
        vm.expectEmit(true, true, true, true, address(state));
        emit AnnotationSet(pluginID, AnnotationKind.CALLDATA, "name", keccak256(bytes(pluginName)), pluginName);
        emit AnnotationSet(pluginID, AnnotationKind.CALLDATA, "src", keccak256(bytes(pluginSrc)), pluginSrc);
        // register a generic plugin by pointing it at the NULL node
        // TODO: we probably don't want to allow generic plugins to reference the NULL node and instead
        //       have some broader concepts like Zone for plugins to reference without reserorting to "everything"
        bytes24 pluginTarget = 0x0; // NULL node, yuk
        dispatcher.dispatch(
            abi.encodeCall(Actions.REGISTER_KIND_PLUGIN, (pluginID, pluginTarget, pluginName, pluginSrc))
        );
        assertEq(state.getPlugin(pluginID), pluginTarget, "expected plugin to reference the target node");
    }

    function testRegisterBuildingKindPlugin() public {
        // register a building kind
        vm.startPrank(aliceAccount);
        bytes24 buildingKind = Node.BuildingKind(20);
        bytes24[4] memory defaultMaterialItem;
        defaultMaterialItem[0] = ItemUtils.Kiki();
        defaultMaterialItem[1] = ItemUtils.Bouba();
        defaultMaterialItem[2] = ItemUtils.Semiote();
        uint64[4] memory defaultMaterialQty;
        defaultMaterialQty[0] = 25;
        defaultMaterialQty[1] = 25;
        defaultMaterialQty[2] = 25;
        dispatcher.dispatch(
            abi.encodeCall(
                Actions.REGISTER_BUILDING_KIND, (buildingKind, "hut", defaultMaterialItem, defaultMaterialQty)
            )
        );
        vm.stopPrank();
        // register a plugin for the kind
        bytes24 pluginID = Node.ClientPlugin(20);
        string memory pluginName = "building-plugin";
        string memory pluginSrc = "function(){}";
        vm.startPrank(aliceAccount);
        // expect plugin metadata emitted
        vm.expectEmit(true, true, true, true, address(state));
        emit AnnotationSet(pluginID, AnnotationKind.CALLDATA, "name", keccak256(bytes(pluginName)), pluginName);
        emit AnnotationSet(pluginID, AnnotationKind.CALLDATA, "src", keccak256(bytes(pluginSrc)), pluginSrc);
        dispatcher.dispatch(
            abi.encodeCall(Actions.REGISTER_KIND_PLUGIN, (pluginID, buildingKind, pluginName, pluginSrc))
        );
        vm.stopPrank();
        // check building kind assigned to plugin
        assertEq(state.getPlugin(pluginID), buildingKind, "expected plugin to reference building kind");

        // check that bob is not able to overwrite alice's plugin metadata
        vm.startPrank(bobAccount);
        vm.expectRevert(PluginNotPluginOwner.selector); // expect fail as one wood short
        dispatcher.dispatch(
            abi.encodeCall(Actions.REGISTER_KIND_PLUGIN, (pluginID, buildingKind, pluginName, "BAD_CODE"))
        );
        vm.stopPrank();
    }

    function testPluginOwnerNotTargetOwner() public {
        // alice registers a building kind
        vm.startPrank(aliceAccount);
        bytes24 buildingKind = Node.BuildingKind(30);
        bytes24[4] memory defaultMaterialItem;
        defaultMaterialItem[0] = ItemUtils.Kiki();
        defaultMaterialItem[1] = ItemUtils.Bouba();
        defaultMaterialItem[2] = ItemUtils.Semiote();
        uint64[4] memory defaultMaterialQty;
        defaultMaterialQty[0] = 25;
        defaultMaterialQty[1] = 25;
        defaultMaterialQty[2] = 25;
        dispatcher.dispatch(
            abi.encodeCall(
                Actions.REGISTER_BUILDING_KIND, (buildingKind, "hut", defaultMaterialItem, defaultMaterialQty)
            )
        );
        vm.stopPrank();
        //
        // then bob tries to try register a plugin for alice's kind
        bytes24 pluginID = Node.ClientPlugin(30);
        string memory pluginName = "cheeky-plugin";
        string memory pluginSrc = "function(){}";
        // expect fail as bob was not the owner of the building kind
        vm.startPrank(bobAccount);
        vm.expectRevert(PluginNotTargetOwner.selector); // expect fail as one wood short
        dispatcher.dispatch(
            abi.encodeCall(Actions.REGISTER_KIND_PLUGIN, (pluginID, buildingKind, pluginName, pluginSrc))
        );
        vm.stopPrank();
    }
}

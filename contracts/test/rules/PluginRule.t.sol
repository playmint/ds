// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "../helpers/GameTest.sol";
import "@ds/rules/PluginRule.sol";
import {BuildingCategory} from "@ds/rules/BuildingRule.sol";

using Schema for State;

contract PluginRuleTest is Test, GameTest {
    event AnnotationSet(bytes24 id, AnnotationKind kind, string label, bytes32 ref, string data);

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
        vm.startPrank(players[0].addr);
        bytes24 buildingKind = Node.BuildingKind(20);
        bytes24[4] memory defaultMaterialItem;
        defaultMaterialItem[0] = ItemUtils.GlassGreenGoo();
        defaultMaterialItem[1] = ItemUtils.BeakerBlueGoo();
        defaultMaterialItem[2] = ItemUtils.FlaskRedGoo();
        uint64[4] memory defaultMaterialQty;
        defaultMaterialQty[0] = 25;
        defaultMaterialQty[1] = 25;
        defaultMaterialQty[2] = 25;

        uint32 buildingKindID = 20;
        bytes24 buildingKind = Node.BuildingKind(buildingKindID);
        string memory buildingName = "hut";
        bytes24[4] memory inputItemIDs;
        uint64[4] memory inputQtys;
        dispatcher.dispatch(
            abi.encodeCall(
                Actions.REGISTER_BUILDING_KIND,
                (
                    buildingKindID,
                    buildingName,
                    BuildingCategory.NONE,
                    "",
                    defaultMaterialItem,
                    defaultMaterialQty,
                    inputItemIDs,
                    inputQtys,
                    [bytes24(0)],
                    [uint64(0)]
                )
            )
        );
        vm.stopPrank();
        // register a plugin for the kind
        bytes24 pluginID = Node.ClientPlugin(20);
        string memory pluginName = "building-plugin";
        string memory pluginSrc = "function(){}";
        vm.startPrank(players[0].addr);
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
        vm.startPrank(players[1].addr);
        vm.expectRevert("PluginNotPluginOwner"); // expect fail as one wood short
        dispatcher.dispatch(
            abi.encodeCall(Actions.REGISTER_KIND_PLUGIN, (pluginID, buildingKind, pluginName, "BAD_CODE"))
        );
        vm.stopPrank();
    }

    function testPluginOwnerNotTargetOwner() public {
        // alice registers a building kind
        vm.startPrank(players[0].addr);
        bytes24 buildingKind = Node.BuildingKind(30);
        bytes24[4] memory defaultMaterialItem;
        defaultMaterialItem[0] = ItemUtils.GlassGreenGoo();
        defaultMaterialItem[1] = ItemUtils.BeakerBlueGoo();
        defaultMaterialItem[2] = ItemUtils.FlaskRedGoo();
        uint64[4] memory defaultMaterialQty;
        defaultMaterialQty[0] = 25;
        defaultMaterialQty[1] = 25;
        defaultMaterialQty[2] = 25;
        uint32 buildingKindID = 30;
        bytes24 buildingKind = Node.BuildingKind(buildingKindID);
        string memory buildingName = "hut";
        bytes24[4] memory inputItemIDs;
        uint64[4] memory inputQtys;
        dispatcher.dispatch(
            abi.encodeCall(
                Actions.REGISTER_BUILDING_KIND,
                (
                    buildingKindID,
                    buildingName,
                    BuildingCategory.NONE,
                    "",
                    defaultMaterialItem,
                    defaultMaterialQty,
                    inputItemIDs,
                    inputQtys,
                    [bytes24(0)],
                    [uint64(0)]
                )
            )
        );
        vm.stopPrank();
        //
        // then bob tries to try register a plugin for alice's kind
        bytes24 pluginID = Node.ClientPlugin(30);
        string memory pluginName = "cheeky-plugin";
        string memory pluginSrc = "function(){}";
        // expect fail as bob was not the owner of the building kind
        vm.startPrank(players[1].addr);
        vm.expectRevert("PluginNotTargetOwner"); // expect fail as one wood short
        dispatcher.dispatch(
            abi.encodeCall(Actions.REGISTER_KIND_PLUGIN, (pluginID, buildingKind, pluginName, pluginSrc))
        );
        vm.stopPrank();
    }
}

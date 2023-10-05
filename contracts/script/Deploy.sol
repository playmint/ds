// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Script.sol";

import "cog/IState.sol";
import "cog/IGame.sol";
import "cog/BaseDispatcher.sol";

import {DownstreamGame} from "@ds/Downstream.sol";
import {Actions, BiomeKind} from "@ds/actions/Actions.sol";
import {Node, Schema} from "@ds/schema/Schema.sol";
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
import {ExtractionRule} from "@ds/rules/ExtractionRule.sol";

using Schema for State;

contract GameDeployer is Script {
    function setUp() public {}

    function run() public {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployerAddr = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        address[] memory allowlist = _loadAllowList(deployerAddr);
        DownstreamGame ds = new DownstreamGame();

        string memory o = "key";
        vm.serializeAddress(o, "game", address(ds));
        vm.serializeAddress(o, "state", address(ds.getState()));
        vm.serializeAddress(o, "router", address(ds.getRouter()));
        string memory latestJson = vm.serializeAddress(o, "dispatcher", address(ds.getDispatcher()));
        vm.writeJson(latestJson, "./out/latest.json");

        // enable rules
        BaseDispatcher dispatcher = BaseDispatcher(address(ds.getDispatcher()));
        dispatcher.registerRule(new CheatsRule(deployerAddr));
        dispatcher.registerRule(new MovementRule());
        dispatcher.registerRule(new ScoutRule());
        dispatcher.registerRule(new InventoryRule());
        dispatcher.registerRule(new BuildingRule(ds));
        dispatcher.registerRule(new CraftingRule(ds));
        dispatcher.registerRule(new PluginRule());
        dispatcher.registerRule(new NewPlayerRule(allowlist));
        dispatcher.registerRule(new CombatRule());
        dispatcher.registerRule(new NamingRule());
        dispatcher.registerRule(new BagRule());
        dispatcher.registerRule(new ExtractionRule(ds));

        // register base goos
        dispatcher.dispatch(abi.encodeCall(Actions.REGISTER_ITEM_KIND, (ItemUtils.GreenGoo(), "Green Goo", "15-185")));
        dispatcher.dispatch(abi.encodeCall(Actions.REGISTER_ITEM_KIND, (ItemUtils.BlueGoo(), "Blue Goo", "32-96")));
        dispatcher.dispatch(abi.encodeCall(Actions.REGISTER_ITEM_KIND, (ItemUtils.RedGoo(), "Red Goo", "22-256")));

        //register starter items
        dispatcher.dispatch(abi.encodeCall(Actions.REGISTER_ITEM_KIND, (ItemUtils.AcceptanceLetter(), "Acceptance Letter", "31-311")));
        dispatcher.dispatch(abi.encodeCall(Actions.REGISTER_ITEM_KIND, (ItemUtils.IDCard(), "ID Card", "10-46")));

        vm.stopBroadcast();
    }

    function _loadAllowList(address deployer) private view returns (address[] memory) {
        string memory root = vm.projectRoot();
        string memory path = string.concat(root, "/src/fixtures/allowlist.json");
        string memory json = vm.readFile(path);
        address[] memory addresses = abi.decode(vm.parseJson(json, ".players"), (address[]));
        address[] memory allowlist = new address[](addresses.length+1);
        for (uint256 i = 0; i < addresses.length; i++) {
            allowlist[i] = addresses[i];
        }
        allowlist[addresses.length] = deployer; // allowlist the deployer address
        return allowlist;
    }
}

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
import {Zones721} from "@ds/Zones721.sol";

import {CheatsRule} from "@ds/rules/CheatsRule.sol";
import {MovementRule} from "@ds/rules/MovementRule.sol";
import {InventoryRule} from "@ds/rules/InventoryRule.sol";
import {BuildingRule} from "@ds/rules/BuildingRule.sol";
import {CraftingRule} from "@ds/rules/CraftingRule.sol";
import {PluginRule} from "@ds/rules/PluginRule.sol";
import {NewPlayerRule} from "@ds/rules/NewPlayerRule.sol";
import {CombatRule} from "@ds/rules/CombatRule.sol";
import {NamingRule} from "@ds/rules/NamingRule.sol";
import {BagRule} from "@ds/rules/BagRule.sol";
import {ExtractionRule} from "@ds/rules/ExtractionRule.sol";
import {QuestRule} from "@ds/rules/QuestRule.sol";

using Schema for State;

contract GameDeployer is Script {
    function setUp() public {}

    function run() public {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployerAddr = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        // contract that manages the ownership of zones as NFTs
        Zones721 zoneOwnership = new Zones721(deployerAddr);

        // owner is set to deploy account not this contract's address as calls from this script have a msg.sender of the deployer
        DownstreamGame ds = new DownstreamGame(address(msg.sender), zoneOwnership);
        Dispatcher dispatcher = ds.getDispatcher();

        // tell the zoneOwnership contract to manage the state
        zoneOwnership.registerState(ds.getState());

        // set zone price, the price is a mechanism to prevent bricking
        // the deployment by claiming all the zones
        zoneOwnership.setMintPrice(0.05 ether);

        // deployer claims first zone mostly to make local dev easier
        // we do the withdraw as a sanity check
        zoneOwnership.mintTo{value: 0.05 ether}(deployerAddr);
        zoneOwnership.withdrawPayments(payable(deployerAddr));

        // setup the tokens contract that manages items as ERC1155
        InventoryRule inventoryRule = new InventoryRule(ds);
        address tokenAddress = inventoryRule.getTokensAddress();
        ds.registerTokensContract(tokenAddress);
        ds.autorizeStateMutation(tokenAddress);

        string memory o = "key";
        vm.serializeAddress(o, "game", address(ds));
        vm.serializeAddress(o, "state", address(ds.getState()));
        vm.serializeAddress(o, "router", address(ds.getRouter()));
        vm.serializeAddress(o, "tokens", address(tokenAddress));
        vm.serializeAddress(o, "zones", address(zoneOwnership));
        string memory latestJson = vm.serializeAddress(o, "dispatcher", address(dispatcher));
        vm.writeJson(latestJson, "./out/latest.json");

        // enable rules
        ds.registerRule(new CheatsRule());
        ds.registerRule(new MovementRule(ds));
        ds.registerRule(inventoryRule);
        ds.registerRule(new BuildingRule(ds));
        ds.registerRule(new CraftingRule(ds));
        ds.registerRule(new PluginRule());
        ds.registerRule(new NewPlayerRule());
        ds.registerRule(new CombatRule());
        ds.registerRule(new NamingRule());
        ds.registerRule(new BagRule());
        ds.registerRule(new ExtractionRule(ds));
        ds.registerRule(new QuestRule());

        // register base goos
        dispatcher.dispatch(abi.encodeCall(Actions.REGISTER_ITEM_KIND, (ItemUtils.GreenGoo(), "Green Goo", "15-185")));
        dispatcher.dispatch(abi.encodeCall(Actions.REGISTER_ITEM_KIND, (ItemUtils.BlueGoo(), "Blue Goo", "32-96")));
        dispatcher.dispatch(abi.encodeCall(Actions.REGISTER_ITEM_KIND, (ItemUtils.RedGoo(), "Red Goo", "22-256")));

        //register starter items
        dispatcher.dispatch(
            abi.encodeCall(Actions.REGISTER_ITEM_KIND, (ItemUtils.AcceptanceLetter(), "Acceptance Letter", "31-311"))
        );
        dispatcher.dispatch(abi.encodeCall(Actions.REGISTER_ITEM_KIND, (ItemUtils.IDCard(), "ID Card", "10-46")));

        vm.stopBroadcast();
    }
}

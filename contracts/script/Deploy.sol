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

import {ERC20} from "solmate/tokens/ERC20.sol";

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

contract DummyERC20 is ERC20 {
    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals
    ) ERC20(_name, _symbol, _decimals) {}

    function mint(address to, uint256 value) public virtual {
        _mint(to, value);
    }

    function burn(address from, uint256 value) public virtual {
        _burn(from, value);
    }
}

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

        DummyERC20 bugs = new DummyERC20("Bugs", "BUGS", 0);
        bugs.mint(deployerAddr, 1000);
        bytes24 bugItem = Node.Item("Bug", [uint32(0), uint32(0), uint32(100)], true);

        DummyERC20 orbs = new DummyERC20("Orbs", "ORBS", 0);
        // orbs.mint(deployerAddr, 500);
        bytes24 orbItem = Node.Item("Orb", [uint32(0), uint32(50), uint32(50)], true);

        DummyERC20 dust = new DummyERC20("Dust", "DUST", 0);
        dust.mint(deployerAddr, 30);
        bytes24 dustItem = Node.Item("Dust", [uint32(0), uint32(100), uint32(0)], true);

        string memory o = "key";
        vm.serializeAddress(o, "game", address(ds));
        vm.serializeAddress(o, "state", address(ds.getState()));
        vm.serializeAddress(o, "router", address(ds.getRouter()));
        vm.serializeAddress(o, "tokens", address(tokenAddress));
        vm.serializeAddress(o, "zones", address(zoneOwnership));
        vm.serializeAddress(o, "bugs", address(bugs));
        vm.serializeUint(o, "bugitem", uint256(uint192(bugItem)));
        vm.serializeAddress(o, "orbs", address(orbs));
        vm.serializeUint(o, "orbitem", uint256(uint192(orbItem)));
        vm.serializeAddress(o, "dust", address(dust));
        vm.serializeUint(o, "dustitem", uint256(uint192(dustItem)));
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

        // register the items
        dispatcher.dispatch( abi.encodeCall(Actions.REGISTER_ITEM_KIND, (bugItem, "Bug", "31-122")));
        dispatcher.dispatch( abi.encodeCall(Actions.REGISTER_ITEM_KIND, (orbItem, "Orb", "28-62")));
        dispatcher.dispatch( abi.encodeCall(Actions.REGISTER_ITEM_KIND, (dustItem, "Dust", "28-75")));

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

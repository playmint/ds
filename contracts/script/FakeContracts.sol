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


using Schema for State;

contract FakeContracts is Script {
    function setUp() public {}

    function run() public {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployerAddr = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        DummyERC20 bugs = new DummyERC20("Bugs", "BUGS", 1);
        bugs.mint(deployerAddr, 1000);

        string memory o = "key";
        vm.serializeAddress(o, "bugs", address(bugs));
        string memory latestJson = vm.serializeAddress(o, "dispatcher", address(0));
        vm.writeJson(latestJson, "./out/fakes.json");

        vm.stopBroadcast();
    }
}

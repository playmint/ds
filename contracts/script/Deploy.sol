// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import {Game} from "@ds/Game.sol";
import {Dispatcher} from "cog/Dispatcher.sol";
import {State} from "cog/State.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {Node, BiomeKind, Schema} from "@ds/schema/Schema.sol";
import {DummyBuilding} from "@ds/fixtures/DummyBuilding.sol";
import {ItemUtils, ItemConfig} from "@ds/utils/ItemUtils.sol";
import {BuildingUtils, BuildingConfig, Material, Input, Output} from "@ds/utils/BuildingUtils.sol";

using Schema for State;

contract GameDeployer is Script {
    function setUp() public {}

    function run() public {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(deployerKey);

        address[] memory allowlist = _loadAllowList(vm.addr(deployerKey));
        Game ds = new Game(allowlist);
        console2.log("deployed", address(ds));

        Dispatcher dispatcher = ds.getDispatcher();

        // [TMP] init some stuff to get started...

        // dump a unit at the origin
        bytes24 seeker = Node.Seeker(1);
        dispatcher.dispatch(abi.encodeCall(Actions.SPAWN_SEEKER, (seeker)));

        // discover origin tile
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.DEV_SPAWN_TILE, (BiomeKind.DISCOVERED, 0, 0, 0)));

        // scout some tiles
        _scout(ds, 1, 0, -1, 1);
        _scout(ds, 1, 0, 1, -1);
        _scout(ds, 1, 1, -1, 0);
        _scout(ds, 1, 1, 0, -1);
        _scout(ds, 1, -1, 0, 1);
        _scout(ds, 1, -1, 1, 0);

        // find the base item ids
        bytes24 none = 0x0;
        bytes24 kiki = ItemUtils.Kiki(); // Life
        bytes24 bouba = ItemUtils.Bouba(); // Defence
        bytes24 semiote = ItemUtils.Semiote(); // Attack

        // register a new item id
        bytes24 welcomeCocktail = ItemUtils.register(
            ds,
            ItemConfig({
                id: 100,
                name: "Welcome Cocktail",
                icon: "02-40",
                life: 0,
                defense: 1,
                attack: 2,
                stackable: false,
                implementation: address(0),
                plugin: ""
            })
        );

        // register a "welcome hut" building
        bytes24 welcomeHutBuildingKind = BuildingUtils.register(
            ds,
            BuildingConfig({
                id: 1,
                name: "Welcome Hut",
                materials: [
                    Material({quantity: 25, item: kiki}),
                    Material({quantity: 25, item: bouba}),
                    Material({quantity: 25, item: semiote}),
                    Material({quantity: 0, item: none})
                ],
                inputs: [
                    Input({quantity: 2, item: bouba}),
                    Input({quantity: 2, item: semiote}),
                    Input({quantity: 0, item: none}),
                    Input({quantity: 0, item: none})
                ],
                outputs: [Output({quantity: 1, item: welcomeCocktail})],
                implementation: address(new DummyBuilding()),
                plugin: vm.readFile("src/fixtures/DummyBuilding.js")
            })
        );

        // force construct building
        BuildingUtils.construct(ds, welcomeHutBuildingKind, "building", -1, 1, 0);

        vm.stopBroadcast();
    }

    function _scout(Game ds, uint32 sid, int16 q, int16 r, int16 s) private {
        ds.getDispatcher().dispatch(
            abi.encodeCall(
                Actions.SCOUT_SEEKER,
                (
                    sid, // seeker id (sid)
                    q, // q
                    r, // r
                    s // s
                )
            )
        );
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

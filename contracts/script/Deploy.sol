// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import {Game} from "@ds/Game.sol";
import {Dispatcher} from "cog/Dispatcher.sol";
import {State} from "cog/State.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {Node, BiomeKind, Schema} from "@ds/schema/Schema.sol";

import {DummyBuilding} from "@ds/fixtures/DummyBuilding.sol";
import {KikiFission} from "@ds/fixtures/KikiFission.sol";
import {KikiFusion} from "@ds/fixtures/KikiFusion.sol";
import {FoulFiends} from "@ds/fixtures/FoulFiends.sol";
import {KwikTyre} from "@ds/fixtures/KwikTyre.sol";
import {AllThingsRubber} from "@ds/fixtures/AllThingsRubber.sol";
import {CrazyHermit} from "@ds/fixtures/CrazyHermit.sol";

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

        //register l33tBricks
        bytes24 l33tBricks = ItemUtils.register(
            ds,
            ItemConfig({
                id: 99,
                name: "L33t Bricks",
                icon: "07-191",
                life: 99999,
                defense: 99999,
                attack: 1,
                stackable: true,
                implementation: address(0),
                plugin: ""
            })
        );

        //register the Rubber Duck Chain
        bytes24 rubberDuck = _rubberDuckChain(ds, l33tBricks);


        //register the Kiki Chain & Hermit
        _megaKikiChain(ds, l33tBricks);


        // register welcomeCocktail
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



    function _rubberDuckChain(Game ds, bytes24 l33tBricks) private returns (bytes24) {

        bytes24 budgetTyre = ItemUtils.register(
            ds,
            ItemConfig({
                id: 103,
                name: "Budget Tyre",
                icon: "19-231",
                life: 50,
                defense: 50,
                attack: 0,
                stackable: false,
                implementation: address(0),
                plugin: ""
            })
        );

        bytes24 smellyDuck = ItemUtils.register(
            ds,
            ItemConfig({
                id: 104,
                name: "Smelly \"Duck\"",
                icon: "30-280",
                life: 0,
                defense: 0,
                attack: 50,
                stackable: false,
                implementation: address(0),
                plugin: ""
            })
        );

        bytes24 rubberDuck = ItemUtils.register(
            ds,
            ItemConfig({
                id: 105,
                name: "Rubber Duck",
                icon: "27-101",
                life: 25,
                defense: 25,
                attack: 25,
                stackable: false,
                implementation: address(0),
                plugin: ""
            })
        );

        bytes24 foulFiends = BuildingUtils.register(
            ds,
            BuildingConfig({
                id: 2,
                name: "Foul Fiends",
                materials: [
                        Material({quantity: 100, item: l33tBricks}),
                        Material({quantity: 0, item: 0x0}),
                        Material({quantity: 0, item: 0x0}),
                        Material({quantity: 0, item: 0x0})
                ],
                inputs: [
                    Input({quantity: 100, item: ItemUtils.Semiote()}),
                    Input({quantity: 0, item: 0x0}),
                    Input({quantity: 0, item: 0x0}),
                    Input({quantity: 0, item: 0x0})
                ],
                outputs: [Output({quantity: 1, item: smellyDuck})],
                implementation: address(new FoulFiends()),
                plugin: vm.readFile("src/fixtures/FoulFiends.js")
            })
        );

        bytes24 kwikTyre = BuildingUtils.register(
            ds,
            BuildingConfig({
                id: 3,
                name: "Kwik Tyre",
                materials: [
                        Material({quantity: 100, item: l33tBricks}),
                        Material({quantity: 0, item: 0x0}),
                        Material({quantity: 0, item: 0x0}),
                        Material({quantity: 0, item: 0x0})
                ],
                inputs: [
                    Input({quantity: 100, item: ItemUtils.Kiki()}),
                    Input({quantity: 100, item: ItemUtils.Bouba()}),
                    Input({quantity: 0, item: 0x0}),
                    Input({quantity: 0, item: 0x0})
                ],
                outputs: [Output({quantity: 1, item: budgetTyre})],
                implementation: address(new KwikTyre()),
                plugin: vm.readFile("src/fixtures/KwikTyre.js")
            })
        );

         bytes24 allThingsRubber = BuildingUtils.register(
            ds,
            BuildingConfig({
                id: 4,
                name: "All Things Rubber",
                materials: [
                        Material({quantity: 100, item: l33tBricks}),
                        Material({quantity: 0, item: 0x0}),
                        Material({quantity: 0, item: 0x0}),
                        Material({quantity: 0, item: 0x0})
                ],
                inputs: [
                    Input({quantity: 1, item: smellyDuck}),
                    Input({quantity: 1, item: budgetTyre}),
                    Input({quantity: 0, item: 0x0}),
                    Input({quantity: 0, item: 0x0})
                ],
                outputs: [Output({quantity: 1, item: rubberDuck})],
                implementation: address(new AllThingsRubber()),
                plugin: vm.readFile("src/fixtures/AllThingsRubber.js")
            })
        );

        BuildingUtils.construct(ds, foulFiends, "building", 20, 0, -20);
        BuildingUtils.construct(ds, kwikTyre, "building", 0, 30, -30);
        BuildingUtils.construct(ds, allThingsRubber, "building", 40, 0, -40);

        return rubberDuck;
    }

    function _megaKikiChain(Game ds, bytes24 l33tBricks) private  {

        bytes24 superKiki = ItemUtils.register(
            ds,
            ItemConfig({
                id: 101,
                name: "Super-Kiki",
                icon: "20-187",
                life: 20,
                defense: 0,
                attack: 0,
                stackable: true,
                implementation: address(0),
                plugin: ""
            })
        );

        bytes24 megaKiki = ItemUtils.register(
            ds,
            ItemConfig({
                id: 102,
                name: "MEGA-Kiki",
                icon: "27-59",
                life: 200,
                defense: 0,
                attack: 0,
                stackable: true,
                implementation: address(0),
                plugin: ""
            })
        );

        bytes24 dismemberedHand = ItemUtils.register(
            ds,
            ItemConfig({
                id: 106,
                name: "Dismembered Hand",
                icon: "01-140",
                life: 111,
                defense: 0,
                attack: 0,
                stackable: false,
                implementation: address(0),
                plugin: ""
            })
        );
                
        bytes24 kikiFission = BuildingUtils.register(
            ds,
            BuildingConfig({
                id: 5,
                name: "Kiki Fission",
                materials: [
                        Material({quantity: 100, item: l33tBricks}),
                        Material({quantity: 0, item: 0x0}),
                        Material({quantity: 0, item: 0x0}),
                        Material({quantity: 0, item: 0x0})
                ],
                inputs: [
                    Input({quantity: 100, item: ItemUtils.Kiki()}),
                    Input({quantity: 0, item: 0x0}),
                    Input({quantity: 0, item: 0x0}),
                    Input({quantity: 0, item: 0x0})
                ],
                outputs: [Output({quantity: 5, item: superKiki})],
                implementation: address(new KikiFission()),
                plugin: vm.readFile("src/fixtures/KikiFission.js")
            })
        );  

        bytes24 kikiFusion = BuildingUtils.register(
            ds,
            BuildingConfig({
                id: 6,
                name: "Kiki Fusion",
                materials: [
                        Material({quantity: 100, item: l33tBricks}),
                        Material({quantity: 0, item: 0x0}),
                        Material({quantity: 0, item: 0x0}),
                        Material({quantity: 0, item: 0x0})
                ],
                inputs: [
                    Input({quantity: 100, item: superKiki}),
                    Input({quantity: 0, item: 0x0}),
                    Input({quantity: 0, item: 0x0}),
                    Input({quantity: 0, item: 0x0})
                ],
                outputs: [Output({quantity: 5, item: megaKiki})],
                implementation: address(new KikiFusion()),
                plugin: vm.readFile("src/fixtures/KikiFusion.js")
            })
        );  

        bytes24 crazyHermit = BuildingUtils.register(
            ds,
            BuildingConfig({
                id: 7,
                name: "Crazy Hermit",
                materials: [
                        Material({quantity: 100, item: l33tBricks}),
                        Material({quantity: 0, item: 0x0}),
                        Material({quantity: 0, item: 0x0}),
                        Material({quantity: 0, item: 0x0})
                ],
                inputs: [
                    Input({quantity: 1, item: ItemUtils.Kiki()}),
                    Input({quantity: 1, item: superKiki}),
                    Input({quantity: 1, item: megaKiki}),
                    Input({quantity: 0, item: 0x0})
                ],
                outputs: [Output({quantity: 1, item: dismemberedHand})],
                implementation: address(new CrazyHermit()),
                plugin: vm.readFile("src/fixtures/CrazyHermit.js")
            })
        );  


        BuildingUtils.construct(ds, kikiFission, "building", -10, -15, 15);
        BuildingUtils.construct(ds, kikiFusion, "building", -20, 0, 20);
        BuildingUtils.construct(ds, crazyHermit, "building", 25, 25, 0);
     
    }
}

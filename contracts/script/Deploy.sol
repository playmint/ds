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

import {Slime} from "@ds/fixtures/Slime.sol";
import {ObnoxiousBeaver} from "@ds/fixtures/ObnoxiousBeaver.sol";
import {MechaKaiju} from "@ds/fixtures/MechaKaiju.sol";
import {PrimeEvil} from "@ds/fixtures/PrimeEvil.sol";


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

        //register Gold Coins and Notes
        bytes24 goldCoin = ItemUtils.register(
            ds,
            ItemConfig({
                id: 110,
                name: "Gold Coin",
                icon: "10-33",
                life: 10,
                defense: 10,
                attack: 5,
                stackable: true,
                implementation: address(0),
                plugin: ""
            })
        );

        bytes24 goldNote = ItemUtils.register(
            ds,
            ItemConfig({
                id: 111,
                name: "Gold Note",
                icon: "10-32",
                life: 50,
                defense: 10,
                attack: 25,
                stackable: true,
                implementation: address(0),
                plugin: ""
            })
        );


        //register welcome hut and cocktail
        _welcomeHut(ds);

        //register the Rubber Duck Chain
        _rubberDuckChain(ds, l33tBricks);


        //register the Kiki Chain & Hermit
        _megaKikiChain(ds, l33tBricks);

        //register monsters
        _enemySpawn(ds, goldCoin, goldNote);



        


        // scout the tiles
        _scout(ds, 1, 0, -1, 1);
        _scout(ds, 1, 0, 1, -1);
        _scout(ds, 1, 1, -1, 0);
        _scout(ds, 1, 1, 0, -1);
        _scout(ds, 1, -1, 0, 1);
        _scout(ds, 1, -1, 1, 0);

        /*
        //This would go to the Hermit if it worked
        _scout(ds, 1, 2, -1, -1);
        _scout(ds, 1, 3, -1, -2);
        _scout(ds, 1, 3, 0, -3);
        _scout(ds, 1, 3, 1, -4);
        _scout(ds, 1, 4, 1, -5);
        _scout(ds, 1, 4, 2, -6);
        _scout(ds, 1, 3, 3, -6);
        _scout(ds, 1, 3, 4, -7);
        _scout(ds, 1, 3, 5, -8);
        _scout(ds, 1, 3, 6, -9);
        _scout(ds, 1, 3, 7, -10);
        _scout(ds, 1, 4, 7, -11);
        _scout(ds, 1, 5, 7, -12);
        _scout(ds, 1, 6, 7, -13);
        */
    


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

    function _welcomeHut(Game ds) private {
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

        bytes24 welcomeHutBuildingKind = BuildingUtils.register(
            ds,
            BuildingConfig({
                id: 1,
                name: "Welcome Hut",
                materials: [
                    Material({quantity: 25, item: ItemUtils.Kiki()}),
                    Material({quantity: 25, item: ItemUtils.Bouba()}),
                    Material({quantity: 25, item: ItemUtils.Semiote()}),
                    Material({quantity: 0, item: 0x0})
                ],
                inputs: [
                    Input({quantity: 2, item: ItemUtils.Bouba()}),
                    Input({quantity: 2, item: ItemUtils.Semiote()}),
                    Input({quantity: 0, item: 0x0}),
                    Input({quantity: 0, item: 0x0})
                ],
                outputs: [Output({quantity: 1, item: welcomeCocktail})],
                implementation: address(new DummyBuilding()),
                plugin: vm.readFile("src/fixtures/DummyBuilding.js")
            })
        );
        
        BuildingUtils.construct(ds, welcomeHutBuildingKind, "building", -1, 2, -1);
    }

    function _rubberDuckChain(Game ds, bytes24 l33tBricks) private {
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

        BuildingUtils.construct(ds, foulFiends, "building", 3, -3, 0);
        BuildingUtils.construct(ds, kwikTyre, "building", -4, 3, 1);
        BuildingUtils.construct(ds, allThingsRubber, "building", -10, 0, 10);
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
        BuildingUtils.construct(ds, crazyHermit, "building", 7, 7, -14);
     
    }

    
    function _enemySpawn(Game ds, bytes24 goldCoin, bytes24 goldNote) private {

        bytes24 slime = BuildingUtils.register(
            ds,
            BuildingConfig({
                id: 8,
                name: "Slime",
                materials: [
                        Material({quantity: 5, item: goldCoin}),
                        Material({quantity: 0, item: 0x0}),
                        Material({quantity: 0, item: 0x0}),
                        Material({quantity: 0, item: 0x0})
                ],
                inputs: [
                    Input({quantity: 0, item: 0x0}),
                    Input({quantity: 0, item: 0x0}),
                    Input({quantity: 0, item: 0x0}),
                    Input({quantity: 0, item: 0x0})
                ],
                outputs: [Output({quantity: 0, item: 0x0})],
                implementation: address(new Slime()),
                plugin: vm.readFile("src/fixtures/Slime.js")
            })
        );  

        bytes24 obnoxiousBeaver = BuildingUtils.register(
            ds,
            BuildingConfig({
                id: 9,
                name: "Obnoxious Beaver",
                materials: [
                        Material({quantity: 20, item: goldCoin}),
                        Material({quantity: 0, item: 0x0}),
                        Material({quantity: 0, item: 0x0}),
                        Material({quantity: 0, item: 0x0})
                ],
                inputs: [
                    Input({quantity: 0, item: 0x0}),
                    Input({quantity: 0, item: 0x0}),
                    Input({quantity: 0, item: 0x0}),
                    Input({quantity: 0, item: 0x0})
                ],
                outputs: [Output({quantity: 0, item: 0x0})],
                implementation: address(new ObnoxiousBeaver()),
                plugin: vm.readFile("src/fixtures/ObnoxiousBeaver.js")
            })
        );  

        bytes24 mechaKaiju = BuildingUtils.register(
            ds,
            BuildingConfig({
                id: 10,
                name: "Lesser Evil",
                materials: [
                        Material({quantity: 20, item: goldCoin}),
                        Material({quantity: 10, item: goldNote}),
                        Material({quantity: 0, item: 0x0}),
                        Material({quantity: 0, item: 0x0})
                ],
                inputs: [
                    Input({quantity: 0, item: 0x0}),
                    Input({quantity: 0, item: 0x0}),
                    Input({quantity: 0, item: 0x0}),
                    Input({quantity: 0, item: 0x0})
                ],
                outputs: [Output({quantity: 0, item: 0x0})],
                implementation: address(new MechaKaiju()),
                plugin: vm.readFile("src/fixtures/MechaKaiju.js")
            })
        );  

        bytes24 primeEvil = BuildingUtils.register(
            ds,
            BuildingConfig({
                id: 11,
                name: "Prime Evil",
                materials: [
                        Material({quantity: 30, item: goldCoin}),
                        Material({quantity: 30, item: goldNote}),
                        Material({quantity: 0, item: 0x0}),
                        Material({quantity: 0, item: 0x0})
                ],
                inputs: [
                    Input({quantity: 0, item: 0x0}),
                    Input({quantity: 0, item: 0x0}),
                    Input({quantity: 0, item: 0x0}),
                    Input({quantity: 0, item: 0x0})
                ],
                outputs: [Output({quantity: 0, item: 0x0})],
                implementation: address(new PrimeEvil()),
                plugin: vm.readFile("src/fixtures/PrimeEvil.js")
            })
        );  

        BuildingUtils.construct(ds, slime, "enemy", 8, -10, 2);
        BuildingUtils.construct(ds, obnoxiousBeaver, "enemy", 9, -11, 2);
        BuildingUtils.construct(ds, mechaKaiju, "enemy", 10, -12, 2);
        BuildingUtils.construct(ds, primeEvil, "enemy", 11, -13, 2);
    }
}

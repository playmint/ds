// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import {Game} from "@ds/Game.sol";
import {Dispatcher} from "cog/Dispatcher.sol";
import {State} from "cog/State.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {Node, BiomeKind, Schema} from "@ds/schema/Schema.sol";

import {CocktailHut} from "@ds/fixtures/CocktailHut.sol";

import {GreenGooFission} from "@ds/fixtures/GreenGooFission.sol";
import {GreenGooFusion} from "@ds/fixtures/GreenGooFusion.sol";
import {FoulFiends} from "@ds/fixtures/FoulFiends.sol";
import {KwikTyre} from "@ds/fixtures/KwikTyre.sol";
import {AllThingsRubber} from "@ds/fixtures/AllThingsRubber.sol";
import {CrazyHermit} from "@ds/fixtures/CrazyHermit.sol";

import {Slime} from "@ds/fixtures/Slime.sol";
import {ObnoxiousBeaver} from "@ds/fixtures/ObnoxiousBeaver.sol";
import {MechaKaiju} from "@ds/fixtures/MechaKaiju.sol";
import {PrimeEvil} from "@ds/fixtures/PrimeEvil.sol";
import {TheBigBad} from "@ds/fixtures/TheBigBad.sol";

import {TheUltimateGoal} from "@ds/fixtures/TheUltimateGoal.sol";

import {BadmintonWeapons} from "@ds/fixtures/BadmintonWeapons.sol";
import {BadmintonArmour} from "@ds/fixtures/BadmintonArmour.sol";

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
                greenGoo: 99999,
                blueGoo: 99999,
                redGoo: 1,
                stackable: true,
                implementation: address(0),
                plugin: ""
            })
        );

        //register Gold Coins and Notes
        bytes24 goldCoin = ItemUtils.register(
            ds,
            ItemConfig({
                id: 200,
                name: "Gold Coin",
                icon: "10-33",
                greenGoo: 10,
                blueGoo: 10,
                redGoo: 5,
                stackable: true,
                implementation: address(0),
                plugin: ""
            })
        );

        bytes24 goldNote = ItemUtils.register(
            ds,
            ItemConfig({
                id: 201,
                name: "Gold Note",
                icon: "10-32",
                greenGoo: 50,
                blueGoo: 10,
                redGoo: 25,
                stackable: true,
                implementation: address(0),
                plugin: ""
            })
        );

        bytes24 bigBadEssence = ItemUtils.register(
            ds,
            ItemConfig({
                id: 202,
                name: "Big Bad Essence",
                icon: "14-303",
                greenGoo: 100,
                blueGoo: 25,
                redGoo: 50,
                stackable: true,
                implementation: address(0),
                plugin: ""
            })
        );

        //register welcome hut and cocktail
        _cocktailHut(ds);

        //register the Rubber Duck Chain
        _rubberDuckChain(ds, l33tBricks);

        //register the Kiki Chain & Hermit
        bytes24 dismemberedHand = _greenGooChain(ds, l33tBricks);

        //register monsters
        _enemySpawn(ds, goldCoin, goldNote);

        //register big bad
        _bigBadSpawn(ds, bigBadEssence);

        //register Ultimate Goal
        _ultimateGoalSpawn(ds, l33tBricks, dismemberedHand, bigBadEssence);

        //register badminton gear
        _badmintonGear(ds, goldCoin);

        // scout the tiles
        _scout(ds, 1, 0, -1, 1);
        _scout(ds, 1, 0, 1, -1);
        _scout(ds, 1, 1, -1, 0);
        _scout(ds, 1, 1, 0, -1);
        _scout(ds, 1, -1, 0, 1);
        _scout(ds, 1, -1, 1, 0);

        //This creates a path to the Hermit
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.DEV_SPAWN_TILE, (BiomeKind.DISCOVERED, 2, -1, -1)));
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.DEV_SPAWN_TILE, (BiomeKind.DISCOVERED, 3, -1, -2)));
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.DEV_SPAWN_TILE, (BiomeKind.DISCOVERED, 3, 0, -3)));

        ds.getDispatcher().dispatch(abi.encodeCall(Actions.DEV_SPAWN_TILE, (BiomeKind.DISCOVERED, 3, 1, -4)));
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.DEV_SPAWN_TILE, (BiomeKind.DISCOVERED, 4, 1, -5)));
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.DEV_SPAWN_TILE, (BiomeKind.DISCOVERED, 4, 2, -6)));

        ds.getDispatcher().dispatch(abi.encodeCall(Actions.DEV_SPAWN_TILE, (BiomeKind.DISCOVERED, 3, 3, -6)));
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.DEV_SPAWN_TILE, (BiomeKind.DISCOVERED, 3, 4, -7)));
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.DEV_SPAWN_TILE, (BiomeKind.DISCOVERED, 3, 5, -8)));

        ds.getDispatcher().dispatch(abi.encodeCall(Actions.DEV_SPAWN_TILE, (BiomeKind.DISCOVERED, 3, 6, -9)));
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.DEV_SPAWN_TILE, (BiomeKind.DISCOVERED, 3, 7, -10)));
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.DEV_SPAWN_TILE, (BiomeKind.DISCOVERED, 4, 7, -11)));

        ds.getDispatcher().dispatch(abi.encodeCall(Actions.DEV_SPAWN_TILE, (BiomeKind.DISCOVERED, 0, 12, -12)));
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.DEV_SPAWN_TILE, (BiomeKind.DISCOVERED, 6, 7, -13)));

        //Adding some extra starting world
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.DEV_SPAWN_TILE, (BiomeKind.DISCOVERED, -2, 2, 0)));
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.DEV_SPAWN_TILE, (BiomeKind.DISCOVERED, -3, 2, 1)));
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.DEV_SPAWN_TILE, (BiomeKind.DISCOVERED, -3, 3, 0)));
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.DEV_SPAWN_TILE, (BiomeKind.DISCOVERED, -2, 1, 1)));
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.DEV_SPAWN_TILE, (BiomeKind.DISCOVERED, 2, -3, 1)));
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.DEV_SPAWN_TILE, (BiomeKind.DISCOVERED, 2, -2, 0)));
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.DEV_SPAWN_TILE, (BiomeKind.DISCOVERED, 1, -2, 1)));
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.DEV_SPAWN_TILE, (BiomeKind.DISCOVERED, -3, 1, 2)));
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.DEV_SPAWN_TILE, (BiomeKind.DISCOVERED, -3, 0, 3)));
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.DEV_SPAWN_TILE, (BiomeKind.DISCOVERED, -2, -1, 3)));
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.DEV_SPAWN_TILE, (BiomeKind.DISCOVERED, -2, 0, 2)));
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.DEV_SPAWN_TILE, (BiomeKind.DISCOVERED, -1, -1, 2)));
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.DEV_SPAWN_TILE, (BiomeKind.DISCOVERED, 0, -2, 2)));

        //Add some land around the far-away buildings
        //All things rubber
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.DEV_SPAWN_TILE, (BiomeKind.DISCOVERED, -11, 1, 10)));
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.DEV_SPAWN_TILE, (BiomeKind.DISCOVERED, -10, -1, 11)));
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.DEV_SPAWN_TILE, (BiomeKind.DISCOVERED, -9, 0, 9)));

        //Green Goo Fusion
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.DEV_SPAWN_TILE, (BiomeKind.DISCOVERED, -21, 1, 20)));
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.DEV_SPAWN_TILE, (BiomeKind.DISCOVERED, -20, -1, 21)));
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.DEV_SPAWN_TILE, (BiomeKind.DISCOVERED, -19, 0, 19)));

        //Green Goo Fission
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.DEV_SPAWN_TILE, (BiomeKind.DISCOVERED, -11, -14, 25)));
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.DEV_SPAWN_TILE, (BiomeKind.DISCOVERED, -10, -16, 26)));
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.DEV_SPAWN_TILE, (BiomeKind.DISCOVERED, -9, -15, 24)));

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

    function _cocktailHut(Game ds) private {
        bytes24 cocktail = ItemUtils.register(
            ds,
            ItemConfig({
                id: 100,
                name: "Cocktail",
                icon: "02-40",
                greenGoo: 0,
                blueGoo: 2,
                redGoo: 0,
                stackable: false,
                implementation: address(0),
                plugin: ""
            })
        );

        bytes24 cocktailHut = BuildingUtils.register(
            ds,
            BuildingConfig({
                id: 100,
                name: "Cocktail Hut",
                materials: [
                    Material({quantity: 25, item: ItemUtils.GlassGreenGoo()}),
                    Material({quantity: 25, item: ItemUtils.BeakerBlueGoo()}),
                    Material({quantity: 25, item: ItemUtils.FlaskRedGoo()}),
                    Material({quantity: 0, item: 0x0})
                ],
                inputs: [
                    Input({quantity: 2, item: ItemUtils.BeakerBlueGoo()}),
                    Input({quantity: 2, item: ItemUtils.FlaskRedGoo()}),
                    Input({quantity: 0, item: 0x0}),
                    Input({quantity: 0, item: 0x0})
                ],
                outputs: [Output({quantity: 1, item: cocktail})],
                implementation: address(new CocktailHut()),
                plugin: vm.readFile("src/fixtures/CocktailHut.js")
            })
        );

        BuildingUtils.construct(ds, cocktailHut, "building", 5, 13, -18);
    }

    function _rubberDuckChain(Game ds, bytes24 l33tBricks) private {
        bytes24 budgetTyre = ItemUtils.register(
            ds,
            ItemConfig({
                id: 103,
                name: "Budget Tyre",
                icon: "19-231",
                greenGoo: 50,
                blueGoo: 50,
                redGoo: 0,
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
                greenGoo: 0,
                blueGoo: 0,
                redGoo: 50,
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
                greenGoo: 25,
                blueGoo: 25,
                redGoo: 25,
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
                    Input({quantity: 100, item: ItemUtils.FlaskRedGoo()}),
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
                    Input({quantity: 100, item: ItemUtils.GlassGreenGoo()}),
                    Input({quantity: 100, item: ItemUtils.BeakerBlueGoo()}),
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

    function _greenGooChain(Game ds, bytes24 l33tBricks) private returns (bytes24) {
        bytes24 vibrantGreenGoo = ItemUtils.register(
            ds,
            ItemConfig({
                id: 101,
                name: "Vibrant Green Goo",
                icon: "22-197",
                greenGoo: 20,
                blueGoo: 0,
                redGoo: 0,
                stackable: true,
                implementation: address(0),
                plugin: ""
            })
        );

        bytes24 reallyGreenGoo = ItemUtils.register(
            ds,
            ItemConfig({
                id: 102,
                name: "Really Green Goo",
                icon: "22-192",
                greenGoo: 200,
                blueGoo: 0,
                redGoo: 0,
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
                greenGoo: 111,
                blueGoo: 0,
                redGoo: 0,
                stackable: false,
                implementation: address(0),
                plugin: ""
            })
        );

        bytes24 greenGooFission = BuildingUtils.register(
            ds,
            BuildingConfig({
                id: 5,
                name: "Green Goo Fission",
                materials: [
                    Material({quantity: 100, item: l33tBricks}),
                    Material({quantity: 0, item: 0x0}),
                    Material({quantity: 0, item: 0x0}),
                    Material({quantity: 0, item: 0x0})
                ],
                inputs: [
                    Input({quantity: 100, item: ItemUtils.GlassGreenGoo()}),
                    Input({quantity: 0, item: 0x0}),
                    Input({quantity: 0, item: 0x0}),
                    Input({quantity: 0, item: 0x0})
                ],
                outputs: [Output({quantity: 5, item: vibrantGreenGoo})],
                implementation: address(new GreenGooFission()),
                plugin: vm.readFile("src/fixtures/GreenGooFission.js")
            })
        );

        bytes24 greenGooFusion = BuildingUtils.register(
            ds,
            BuildingConfig({
                id: 6,
                name: "Green Goo Fusion",
                materials: [
                    Material({quantity: 100, item: l33tBricks}),
                    Material({quantity: 0, item: 0x0}),
                    Material({quantity: 0, item: 0x0}),
                    Material({quantity: 0, item: 0x0})
                ],
                inputs: [
                    Input({quantity: 100, item: vibrantGreenGoo}),
                    Input({quantity: 0, item: 0x0}),
                    Input({quantity: 0, item: 0x0}),
                    Input({quantity: 0, item: 0x0})
                ],
                outputs: [Output({quantity: 5, item: reallyGreenGoo})],
                implementation: address(new GreenGooFusion()),
                plugin: vm.readFile("src/fixtures/GreenGooFusion.js")
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
                    Input({quantity: 1, item: ItemUtils.GlassGreenGoo()}),
                    Input({quantity: 1, item: vibrantGreenGoo}),
                    Input({quantity: 1, item: reallyGreenGoo}),
                    Input({quantity: 0, item: 0x0})
                ],
                outputs: [Output({quantity: 1, item: dismemberedHand})],
                implementation: address(new CrazyHermit()),
                plugin: vm.readFile("src/fixtures/CrazyHermit.js")
            })
        );

        BuildingUtils.construct(ds, greenGooFission, "building", -10, -15, 25);
        BuildingUtils.construct(ds, greenGooFusion, "building", -20, 0, 20);
        BuildingUtils.construct(ds, crazyHermit, "building", 7, 7, -14);

        return dismemberedHand;
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
                name: "Mecha-Kaiju",
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

        BuildingUtils.construct(ds, slime, "enemy", -1, -4, 5);
        BuildingUtils.construct(ds, slime, "enemy", 1, 5, -6);
        BuildingUtils.construct(ds, slime, "enemy", 3, -7, 4);
        BuildingUtils.construct(ds, slime, "enemy", -4, 8, -4);
        BuildingUtils.construct(ds, slime, "enemy", 8, -12, 4);
        BuildingUtils.construct(ds, slime, "enemy", -8, 9, -1);
        BuildingUtils.construct(ds, slime, "enemy", -6, -4, 10);
        BuildingUtils.construct(ds, slime, "enemy", 6, -5, -1);
        BuildingUtils.construct(ds, slime, "enemy", 5, 7, -12);
        BuildingUtils.construct(ds, slime, "enemy", -4, -8, 12);
        BuildingUtils.construct(ds, slime, "enemy", 9, 0, -9);
        BuildingUtils.construct(ds, slime, "enemy", 0, -12, 12);

        BuildingUtils.construct(ds, obnoxiousBeaver, "enemy", 10, 8, -18);
        BuildingUtils.construct(ds, obnoxiousBeaver, "enemy", -3, 13, -10);
        BuildingUtils.construct(ds, obnoxiousBeaver, "enemy", 10, -7, -3);
        BuildingUtils.construct(ds, obnoxiousBeaver, "enemy", -18, 8, 10);
        BuildingUtils.construct(ds, obnoxiousBeaver, "enemy", 10, 2, -12);
        BuildingUtils.construct(ds, obnoxiousBeaver, "enemy", -13, -4, 17);

        BuildingUtils.construct(ds, mechaKaiju, "enemy", 15, 6, -21);
        BuildingUtils.construct(ds, mechaKaiju, "enemy", -14, -7, 21);
        BuildingUtils.construct(ds, mechaKaiju, "enemy", -5, 20, -15);
        BuildingUtils.construct(ds, mechaKaiju, "enemy", 10, -21, 11);

        BuildingUtils.construct(ds, primeEvil, "enemy", 12, -25, 13);
        BuildingUtils.construct(ds, primeEvil, "enemy", -26, 18, 8);
    }

    function _bigBadSpawn(Game ds, bytes24 bigBadEssence) private {
        bytes24 theBigBad = BuildingUtils.register(
            ds,
            BuildingConfig({
                id: 12,
                name: "The Big Bad",
                materials: [
                    Material({quantity: 10, item: bigBadEssence}),
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
                implementation: address(new TheBigBad()),
                plugin: vm.readFile("src/fixtures/TheBigBad.js")
            })
        );

        BuildingUtils.construct(ds, theBigBad, "enemy", -15, 27, -12);
    }

    function _ultimateGoalSpawn(Game ds, bytes24 l33tBricks, bytes24 dismemberedHand, bytes24 bigBadEssence) private {
        bytes24 crappyMedal = ItemUtils.register(
            ds,
            ItemConfig({
                id: 107,
                name: "Crappy Medal",
                icon: "10-111",
                greenGoo: 105,
                blueGoo: 12,
                redGoo: 25,
                stackable: false,
                implementation: address(0),
                plugin: ""
            })
        );

        bytes24 theUltimateGoal = BuildingUtils.register(
            ds,
            BuildingConfig({
                id: 15,
                name: "The Ultimate Goal",
                materials: [
                    Material({quantity: 100, item: l33tBricks}),
                    Material({quantity: 0, item: 0x0}),
                    Material({quantity: 0, item: 0x0}),
                    Material({quantity: 0, item: 0x0})
                ],
                inputs: [
                    Input({quantity: 1, item: dismemberedHand}),
                    Input({quantity: 1, item: bigBadEssence}),
                    Input({quantity: 0, item: 0x0}),
                    Input({quantity: 0, item: 0x0})
                ],
                outputs: [Output({quantity: 1, item: crappyMedal})],
                implementation: address(new TheUltimateGoal()),
                plugin: vm.readFile("src/fixtures/TheUltimateGoal.js")
            })
        );

        BuildingUtils.construct(ds, theUltimateGoal, "story-building", -1, 2, -1);
    }

    function _badmintonGear(Game ds, bytes24 goldCoin) private {
        bytes24 shuttlecock = ItemUtils.register(
            ds,
            ItemConfig({
                id: 108,
                name: "Shuttlecock",
                icon: "05-296",
                greenGoo: 10,
                blueGoo: 10,
                redGoo: 105,
                stackable: false,
                implementation: address(0),
                plugin: ""
            })
        );

        bytes24 racket = ItemUtils.register(
            ds,
            ItemConfig({
                id: 109,
                name: "Racket",
                icon: "22-13",
                greenGoo: 10,
                blueGoo: 110,
                redGoo: 5,
                stackable: false,
                implementation: address(0),
                plugin: ""
            })
        );

        BuildingUtils.register(
            ds,
            BuildingConfig({
                id: 13,
                name: "Badminton Weapons",
                materials: [
                    Material({quantity: 5, item: goldCoin}),
                    Material({quantity: 50, item: ItemUtils.GlassGreenGoo()}),
                    Material({quantity: 50, item: ItemUtils.BeakerBlueGoo()}),
                    Material({quantity: 50, item: ItemUtils.FlaskRedGoo()})
                ],
                inputs: [
                    Input({quantity: 2, item: goldCoin}),
                    Input({quantity: 100, item: ItemUtils.FlaskRedGoo()}),
                    Input({quantity: 100, item: ItemUtils.FlaskRedGoo()}),
                    Input({quantity: 0, item: 0x0})
                ],
                outputs: [Output({quantity: 1, item: shuttlecock})],
                implementation: address(new BadmintonWeapons()),
                plugin: vm.readFile("src/fixtures/BadmintonWeapons.js")
            })
        );

        BuildingUtils.register(
            ds,
            BuildingConfig({
                id: 14,
                name: "Badminton Armour",
                materials: [
                    Material({quantity: 5, item: goldCoin}),
                    Material({quantity: 50, item: ItemUtils.GlassGreenGoo()}),
                    Material({quantity: 50, item: ItemUtils.BeakerBlueGoo()}),
                    Material({quantity: 50, item: ItemUtils.FlaskRedGoo()})
                ],
                inputs: [
                    Input({quantity: 2, item: goldCoin}),
                    Input({quantity: 100, item: ItemUtils.BeakerBlueGoo()}),
                    Input({quantity: 100, item: ItemUtils.BeakerBlueGoo()}),
                    Input({quantity: 0, item: 0x0})
                ],
                outputs: [Output({quantity: 1, item: racket})],
                implementation: address(new BadmintonArmour()),
                plugin: vm.readFile("src/fixtures/BadmintonArmour.js")
            })
        );
    }
}

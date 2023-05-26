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

        Game ds = new Game();
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
        bytes24 kiki = ItemUtils.Kiki();
        bytes24 bouba = ItemUtils.Bouba();
        bytes24 semiote = ItemUtils.Semiote();

        // register a new item id
        bytes24 welcomeCocktail = ItemUtils.register(
            ds,
            ItemConfig({
                id: 100,
                name: "Welcome Cocktail",
                icon: "02-40",
                life: 1,
                defense: 1,
                attack: 0,
                stackable: true,
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
                    Input({quantity: 2, item: kiki}),
                    Input({quantity: 2, item: bouba}),
                    Input({quantity: 0, item: none}),
                    Input({quantity: 0, item: none})
                ],
                outputs: [Output({quantity: 1, item: welcomeCocktail})],
                implementation: address(new DummyBuilding()),
                plugin: vm.readFile("src/fixtures/DummyBuilding.js")
            })
        );

        // construct building
        _constructBuilding(ds, welcomeHutBuildingKind, seeker, -1, 1, 0);

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

    function _constructBuilding(Game ds, bytes24 buildingKind, bytes24 seeker, int16 q, int16 r, int16 s)
        private
        returns (bytes24 buildingInstance)
    {
        State state = ds.getState();
        // get our building and give it the resources to construct
        buildingInstance = Node.Building(0, q, r, s);
        // magic required items into the construct slot
        bytes24 buildingBag = Node.Bag(uint64(uint256(keccak256(abi.encode(buildingInstance)))));
        state.setEquipSlot(buildingInstance, 0, buildingBag);
        state.setItemSlot(buildingBag, 0, ItemUtils.Kiki(), 25);
        state.setItemSlot(buildingBag, 1, ItemUtils.Bouba(), 25);
        state.setItemSlot(buildingBag, 2, ItemUtils.Semiote(), 25);
        // construct our building
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.CONSTRUCT_BUILDING_SEEKER, (seeker, buildingKind, q, r, s)));
        return buildingInstance;
    }
}

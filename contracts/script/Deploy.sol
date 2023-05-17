// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import {Game} from "@ds/Game.sol";
import {Dispatcher} from "cog/Dispatcher.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {Node, BiomeKind, ItemUtils} from "@ds/schema/Schema.sol";
import {DummyBuilding} from "@ds/fixtures/DummyBuilding.sol";

contract GameDeployer is Script {
    function setUp() public {}

    function run() public {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(deployerKey);

        Game dawnseekers = new Game();
        console2.log("deployed", address(dawnseekers));

        Dispatcher dispatcher = dawnseekers.getDispatcher();

        // [TMP] init some stuff to get started...

        // discover tile 0,0,0
        dispatcher.dispatch(
            abi.encodeCall(
                Actions.DEV_SPAWN_TILE,
                (
                    BiomeKind.DISCOVERED,
                    0, // q
                    0, // r
                    0 // s
                )
            )
        );

        // dump a seeker at that tile
        dispatcher.dispatch(
            abi.encodeCall(
                Actions.DEV_SPAWN_SEEKER,
                (
                    address(0), // owner
                    0, // seeker id (sid)
                    0, // q
                    0, // r
                    0 // s
                )
            )
        );

        // deploy and register the DummyBuilding as a building kind
        bytes24 dummyBuildingKind = Node.BuildingKind(1);
        string memory dummyBuildingKindName = "DummyBuilding";
        string memory dummyBuildingKindSrc = vm.readFile("src/fixtures/DummyBuilding.js");
        bytes24[4] memory dummyBuildingMaterialItem;
        dummyBuildingMaterialItem[0] = ItemUtils.Wood();
        dummyBuildingMaterialItem[1] = ItemUtils.Stone();
        dummyBuildingMaterialItem[2] = ItemUtils.Iron();
        uint64[4] memory dummyBuildingMaterialQty;
        dummyBuildingMaterialQty[0] = 25;
        dummyBuildingMaterialQty[1] = 25;
        dummyBuildingMaterialQty[2] = 25;
        dispatcher.dispatch(abi.encodeCall(Actions.REGISTER_BUILDING_KIND, (dummyBuildingKind, dummyBuildingKindName, dummyBuildingMaterialItem, dummyBuildingMaterialQty)));
        dispatcher.dispatch(
            abi.encodeCall(Actions.REGISTER_BUILDING_CONTRACT, (dummyBuildingKind, address(new DummyBuilding())))
        );
        dispatcher.dispatch(
            abi.encodeCall(
                Actions.REGISTER_CLIENT_PLUGIN,
                (Node.ClientPlugin(1), dummyBuildingKind, dummyBuildingKindName, dummyBuildingKindSrc)
            )
        );

        vm.stopBroadcast();
    }
}

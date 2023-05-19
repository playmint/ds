// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import {Game} from "@ds/Game.sol";
import {Dispatcher} from "cog/Dispatcher.sol";
import {State} from "cog/State.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {Node, BiomeKind, ItemUtils, Schema} from "@ds/schema/Schema.sol";
import {DummyBuilding} from "@ds/fixtures/DummyBuilding.sol";

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
        dispatcher.dispatch(
            abi.encodeCall(
                Actions.SPAWN_SEEKER,
                (seeker)
            )
        );

        // discover origin tile
        ds.getDispatcher().dispatch(
            abi.encodeCall(
                Actions.DEV_SPAWN_TILE,
                (
                    BiomeKind.DISCOVERED, 0, 0, 0
                )
            )
        );

        // scout some tiles
        _scout(ds, 1, 0,-1,1);
        _scout(ds, 1, 0,1,-1);
        _scout(ds, 1, 1,-1,0);
        _scout(ds, 1, 1,0,-1);
        _scout(ds, 1, -1,0,1);
        _scout(ds, 1, -1,1,0);

        // deploy and register the DummyBuilding as a building kind
        bytes24 dummyBuildingKind = Node.BuildingKind(1);
        string memory dummyBuildingKindName = "Welcome Hut";
        string memory dummyBuildingKindSrc = vm.readFile("src/fixtures/DummyBuilding.js");
        bytes24[4] memory dummyBuildingMaterialItem;
        dummyBuildingMaterialItem[0] = ItemUtils.Kiki();
        dummyBuildingMaterialItem[1] = ItemUtils.Bouba();
        dummyBuildingMaterialItem[2] = ItemUtils.Semiote();
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
        // register building crafting recipe
        bytes24[4] memory inputItem;
        inputItem[0] = ItemUtils.Kiki();
        inputItem[1] = ItemUtils.Bouba();
        uint64[4] memory inputQty;
        inputQty[0] = 2;
        inputQty[1] = 2;
        uint32[3] memory outputItemAtoms = [ uint32(1), uint32(1), uint32(0) ];
        bytes24 outputItem = Node.Item("welcomedrink", outputItemAtoms, false);
        uint64 outputQty = 1;
        dispatcher.dispatch(abi.encodeCall(Actions.REGISTER_ITEM_KIND, (outputItem, "Welcome Drink", "02-40")));
        dispatcher.dispatch(abi.encodeCall(Actions.REGISTER_CRAFT_RECIPE, (dummyBuildingKind, inputItem, inputQty, outputItem, outputQty)));

        // construct building
        _constructBuilding(ds, dummyBuildingKind, seeker, -1,1,0);

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

    function _constructBuilding(Game ds, bytes24 buildingKind, bytes24 seeker, int16 q, int16 r, int16 s) private returns (bytes24 buildingInstance) {
        State state = ds.getState();
        // get our building and give it the resources to construct
        buildingInstance = Node.Building(0, q, r, s);
        // magic 100 items into the construct slot
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

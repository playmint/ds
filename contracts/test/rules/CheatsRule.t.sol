// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "../helpers/GameTest.sol";
import {BuildingKind} from "@ds/ext/BuildingKind.sol";

using Schema for State;

contract CheatsRuleTest is Test, GameTest {
    bytes24[4] defaultMaterialItem;
    uint64[4] defaultMaterialQty;
    FacingDirectionKind facing = FacingDirectionKind.RIGHT;

    function setUp() public {
        // setup default material construction costs
        defaultMaterialItem[0] = ItemUtils.GreenGoo();
        defaultMaterialItem[1] = ItemUtils.BlueGoo();
        defaultMaterialItem[2] = ItemUtils.RedGoo();
        defaultMaterialQty[0] = 25;
        defaultMaterialQty[1] = 25;
        defaultMaterialQty[2] = 25;
    }

    // To be implemented: base it off of BuildingRule.t.sol
    function testSpawnTile() public {
        (int16 z, int16 q, int16 r, int16 s) = (0, 1, -1, 0);
        vm.prank(address(dev));
        dispatcher.dispatch(abi.encodeCall(Actions.DEV_SPAWN_TILE, (z, q, r, s)));

        // check the tile has been spawned
        bytes24 tile = Node.Tile(z, q, r, s);
        assertTrue(state.getBiome(tile) == BiomeKind.DISCOVERED, "expected tile to be spawned (DISCOVERED)");
    }

    // To be implemented: base it off of BuildingRule.t.sol
    function testDestroyTile() public {
        (int16 z, int16 q, int16 r, int16 s) = (0, 1, -1, 0);
        vm.prank(address(dev));
        dispatcher.dispatch(abi.encodeCall(Actions.DEV_SPAWN_TILE, (z, q, r, s)));
        vm.prank(address(dev));
        dispatcher.dispatch(abi.encodeCall(Actions.DEV_DESTROY_TILE, (z, q, r, s)));

        // check the tile has been spawned
        bytes24 tile = Node.Tile(z, q, r, s);
        assertTrue(state.getBiome(tile) == BiomeKind.UNDISCOVERED, "expected tile to be destroyed (UNDISCOVERED)");
    }

    function testSpawnBuilding() public {
        // register a building kind
        bytes24 buildingKind = Node.BuildingKind(20);
        string memory buildingName = "hut";
        bytes24[4] memory inputItemIDs;
        uint64[4] memory inputQtys;

        vm.prank(address(dev));
        dispatcher.dispatch(
            abi.encodeCall(
                Actions.REGISTER_BUILDING_KIND,
                (
                    buildingKind,
                    buildingName,
                    BuildingCategory.NONE,
                    "",
                    defaultMaterialItem,
                    defaultMaterialQty,
                    inputItemIDs,
                    inputQtys,
                    [bytes24(0)],
                    [uint64(0)]
                )
            )
        );

        (int16 z, int16 q, int16 r, int16 s) = (0, -1, 1, 0);
        dev.spawnTile(z, q, r, s);
        vm.prank(address(dev));
        dispatcher.dispatch(abi.encodeCall(Actions.DEV_SPAWN_BUILDING, (buildingKind, z, q, r, s, facing)));

        bytes24 buildingInstance = Node.Building(z, q, r, s);

        // check the building has a location at q/r/s
        assertEq(state.getFixedLocation(buildingInstance), Node.Tile(z, q, r, s), "expected building to have location");
    }

    function testDestroyBuilding() public {
        // register a building kind
        bytes24 buildingKind = Node.BuildingKind(20);
        string memory buildingName = "hut";
        bytes24[4] memory inputItemIDs;
        uint64[4] memory inputQtys;

        dispatcher.dispatch(
            abi.encodeCall(
                Actions.REGISTER_BUILDING_KIND,
                (
                    buildingKind,
                    buildingName,
                    BuildingCategory.NONE,
                    "",
                    defaultMaterialItem,
                    defaultMaterialQty,
                    inputItemIDs,
                    inputQtys,
                    [bytes24(0)],
                    [uint64(0)]
                )
            )
        );

        (int16 z, int16 q, int16 r, int16 s) = (0, -1, 1, 0);
        dev.spawnTile(z, q, r, s);
        vm.prank(address(dev));
        dispatcher.dispatch(abi.encodeCall(Actions.DEV_SPAWN_BUILDING, (buildingKind, z, q, r, s, facing)));

        // destroy the building
        vm.prank(address(dev));
        dispatcher.dispatch(abi.encodeCall(Actions.DEV_DESTROY_BUILDING, (z, q, r, s)));

        bytes24 buildingInstance = Node.Building(z, q, r, s);

        // check the building has been destroyed
        assertFalse(
            state.getFixedLocation(buildingInstance) == Node.Tile(z, q, r, s), "expected building to be destroyed"
        );
    }

    function testSpawnBag() public {
        // spawn tile
        (int16 z, int16 q, int16 r, int16 s) = (0, 1, 0, -1);
        vm.prank(address(dev));
        dispatcher.dispatch(abi.encodeCall(Actions.DEV_SPAWN_TILE, (z, q, r, s)));

        // spawn a bag on a tile
        uint8 equipSlot = 0;
        bytes24[] memory slotContents = new bytes24[](1);
        uint64[] memory slotBalances = new uint64[](1);
        slotContents[0] = ItemUtils.GreenGoo();
        slotBalances[0] = 100;

        vm.prank(address(dev));
        dispatcher.dispatch(abi.encodeCall(Actions.DEV_SPAWN_BAG, (z, q, r, s, equipSlot, slotContents, slotBalances)));

        bytes24 tile = Node.Tile(z, q, r, s);
        bytes24 bag = state.getEquipSlot(tile, equipSlot);
        (bytes24 item, uint64 qty) = state.getItemSlot(bag, 0);
        assertEq(item, slotContents[0], "expected bag with item1 to be on tile");
        assertEq(qty, 100, "expected bag with item1 to be on tile");
    }

    function testDestroyBag() public {
        // spawn tile
        (int16 z, int16 q, int16 r, int16 s) = (0, 1, 0, -1);
        vm.prank(address(dev));
        dispatcher.dispatch(abi.encodeCall(Actions.DEV_SPAWN_TILE, (z, q, r, s)));

        // spawn a bag
        bytes24 bag = Node.Bag(20);
        address owner = address(this);
        bytes24 equipee = Node.Tile(z, q, r, s);
        uint8 equipSlot = 0;
        bytes24[] memory slotContents = new bytes24[](0);
        uint64[] memory slotBalances = new uint64[](0);

        vm.prank(address(dev));
        dispatcher.dispatch(abi.encodeCall(Actions.DEV_SPAWN_BAG, (z, q, r, s, equipSlot, slotContents, slotBalances)));

        // destroy the bag
        vm.prank(address(dev));
        dispatcher.dispatch(abi.encodeCall(Actions.DEV_DESTROY_BAG, (bag, owner, equipee, equipSlot, slotContents)));

        assertEq(state.getEquipSlot(equipee, equipSlot), bytes24(0), "expected bag to be removed from tile");
    }
}

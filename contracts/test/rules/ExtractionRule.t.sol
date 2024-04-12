// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "../helpers/GameTest.sol";

import {GOO_PER_SEC, GOO_RESERVOIR_MAX} from "@ds/rules/ExtractionRule.sol";
import {BuildingBlockNumKey} from "@ds/schema/Schema.sol";
import {BuildingKind} from "@ds/ext/BuildingKind.sol";

using Schema for State;

uint8 constant MAX_CRAFT_INPUT_ITEMS = 4;
uint64 constant BLOCKS_TO_MAX_RESERVOIR = ((GOO_RESERVOIR_MAX * 100) / (GOO_PER_SEC * BLOCK_TIME_SECS) + 50) / 100;

bool constant ITEM_STACKABLE = true;
bool constant ITEM_EQUIPABLE = false;

contract MockCraftBuildingContract is BuildingKind {
    function use(Game, /*ds*/ bytes24, /*buildingInstance*/ bytes24, /*mobileUnit*/ bytes memory /*payload*/ )
        public
        override
    {}
}

contract ExtractionRuleTest is Test, GameTest {
    // accounts
    address aliceAccount;
    bytes24 aliceMobileUnit;

    // mock building implementation
    bytes24 mockBuildingKind;
    MockCraftBuildingContract mockBuildingContract;

    function setUp() public {
        aliceAccount = players[0].addr;

        dev.spawnTile(0, 0, 0, 0);
        dev.spawnTile(0, -1, 1, 0);

        // mobileUnits
        vm.startPrank(aliceAccount);
        spawnMobileUnit();
        aliceMobileUnit = Node.MobileUnit(aliceAccount);
        // setup a mock building instance owned by alice
        mockBuildingContract = new MockCraftBuildingContract();
        mockBuildingKind = _registerBuildingKind(1001, address(mockBuildingContract));

        ( /*uint64 id*/ , BuildingCategory category) = state.getBuildingKindInfo(mockBuildingKind);
        assertEq(
            uint256(BuildingCategory.EXTRACTOR),
            uint256(category),
            "Expected BuildingCategory.EXTRACTOR to be set on buildingKind"
        );

        // stop being alice
        vm.stopPrank();
    }

    function testBlockNum() public {
        vm.startPrank(aliceAccount);
        bytes24 buildingInstance = _constructBuildingInstance(mockBuildingKind, 0, -1, 1, 0);
        vm.stopPrank();

        uint64 blockNum = state.getBlockNum(buildingInstance, uint8(BuildingBlockNumKey.EXTRACTION));
        assertEq(uint64(block.number), blockNum, "Block number expected to be set on building instance");
    }

    function testExtractionFailureNoElapsedTime() public {
        vm.startPrank(aliceAccount);
        bytes24 buildingInstance = _constructBuildingInstance(mockBuildingKind, 0, -1, 1, 0);
        vm.stopPrank();

        // Expect to revert as no time has passed for exaction to have occured
        vm.startPrank(address(mockBuildingContract));
        vm.expectRevert("not enough green goo extracted to make item");
        dispatcher.dispatch(abi.encodeCall(Actions.EXTRACT, (buildingInstance)));
        vm.stopPrank();
    }

    function testExtractionFailureNoTileGoo() public {
        vm.startPrank(aliceAccount);
        bytes24 buildingInstance = _constructBuildingInstance(mockBuildingKind, 0, -1, 1, 0);
        vm.stopPrank();

        // forcibly set goo values onto the tile
        bytes24 tile = Node.Tile(0, -1, 1, 0);
        state.setTileAtomValues(tile, [uint64(0), uint64(0), uint64(0)]);

        // -- Move time forward
        vm.roll(block.number + 200);

        // Even with elapsed time, there still shouldn't be sufficient goo
        vm.startPrank(address(mockBuildingContract));
        vm.expectRevert("not enough green goo extracted to make item");
        dispatcher.dispatch(abi.encodeCall(Actions.EXTRACT, (buildingInstance)));
        vm.stopPrank();
    }

    function testExtraction() public {
        vm.startPrank(aliceAccount);
        bytes24 buildingInstance = _constructBuildingInstance(mockBuildingKind, 0, -1, 1, 0);
        vm.stopPrank();

        // forcibly set goo values onto the tile
        bytes24 tile = Node.Tile(0, -1, 1, 0);
        state.setTileAtomValues(tile, [uint64(255), uint64(0), uint64(0)]);

        // -- Move time forward to completely fill reservoir
        vm.roll(block.number + 2000);

        // extract
        vm.startPrank(address(mockBuildingContract));
        dispatcher.dispatch(abi.encodeCall(Actions.EXTRACT, (buildingInstance)));
        vm.stopPrank();

        // check that output item now exists in outputBag slot 1
        bytes24 outputBag = state.getEquipSlot(buildingInstance, 1);
        (bytes24 expItem, /*uint64 expBalance*/ ) = state.getOutput(mockBuildingKind, 0);
        (bytes24 gotItem, uint64 gotBalance) = state.getItemSlot(outputBag, 0);
        assertEq(gotItem, expItem, "expected output slot to contain expected output item");
        assertEq(gotBalance, 100, "expected output balance to be a full stack of 100");

        // expect reservoir to be minus the cost of the item batch
        uint64[3] memory reservoirAtoms = state.getBuildingReservoirAtoms(buildingInstance);
        (uint32[3] memory outputItemAtoms, /*bool isStackable*/ ) = state.getItemStructure(expItem);

        assertEq(
            reservoirAtoms[GOO_GREEN],
            GOO_RESERVOIR_MAX - outputItemAtoms[GOO_GREEN] * 100,
            "expected total atomic value of output items to be taken from reservoir"
        );
    }

    function _registerBuildingKind(uint32 uid, address buildingContract) private returns (bytes24) {
        bytes24[4] memory defaultMaterialItem;
        defaultMaterialItem[0] = ItemUtils.GreenGoo();
        defaultMaterialItem[1] = ItemUtils.BlueGoo();
        defaultMaterialItem[2] = ItemUtils.RedGoo();
        uint64[4] memory defaultMaterialQty;
        defaultMaterialQty[0] = 25;
        defaultMaterialQty[1] = 25;
        defaultMaterialQty[2] = 25;
        bytes24 buildingKind = Node.BuildingKind(uid, BuildingCategory.EXTRACTOR);
        string memory buildingName = "TestBuilding";

        bytes24[MAX_CRAFT_INPUT_ITEMS] memory inputItemIDs;
        uint64[MAX_CRAFT_INPUT_ITEMS] memory inputQtys;
        bytes24 outputItem = ItemUtils.GreenGoo();
        uint64 outputQty = 10; // How many we can make in one extraction

        dispatcher.dispatch(
            abi.encodeCall(
                Actions.REGISTER_BUILDING_KIND,
                (
                    buildingKind,
                    buildingName,
                    BuildingCategory.EXTRACTOR,
                    "green",
                    defaultMaterialItem,
                    defaultMaterialQty,
                    inputItemIDs,
                    inputQtys,
                    [outputItem],
                    [outputQty]
                )
            )
        );
        dispatcher.dispatch(abi.encodeCall(Actions.REGISTER_KIND_IMPLEMENTATION, (buildingKind, buildingContract)));
        return buildingKind;
    }

    // _constructCraftingBuilding sets up and constructs a crafting building that
    function _constructBuildingInstance(bytes24 buildingKind, int16 z, int16 q, int16 r, int16 s)
        private
        returns (bytes24 buildingInstance)
    {
        // get our building and give it the resources to construct
        buildingInstance = Node.Building(z, q, r, s);
        // magic 100 items into the construct slot
        bytes24 inputBag = Node.Bag(uint64(uint256(keccak256(abi.encode(buildingInstance)))));
        state.setEquipSlot(buildingInstance, 0, inputBag);
        state.setItemSlot(inputBag, 0, ItemUtils.GreenGoo(), 25);
        state.setItemSlot(inputBag, 1, ItemUtils.BlueGoo(), 25);
        state.setItemSlot(inputBag, 2, ItemUtils.RedGoo(), 25);
        // construct our building
        dispatcher.dispatch(abi.encodeCall(Actions.CONSTRUCT_BUILDING_MOBILE_UNIT, (buildingKind, z, q, r, s)));
        return buildingInstance;
    }
}

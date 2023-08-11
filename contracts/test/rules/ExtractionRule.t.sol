// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";

import {Game} from "cog/IGame.sol";
import {State, AnnotationKind} from "cog/IState.sol";
import {Dispatcher} from "cog/IDispatcher.sol";

import {DownstreamGame} from "@ds/Downstream.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {
    Schema,
    Node,
    Rel,
    LocationKey,
    BiomeKind,
    BuildingCategory,
    GOO_GREEN,
    GOO_BLUE,
    GOO_RED,
    DEFAULT_ZONE,
    BLOCK_TIME_SECS
} from "@ds/schema/Schema.sol";
import {ItemUtils} from "@ds/utils/ItemUtils.sol";
import {BuildingKind} from "@ds/ext/BuildingKind.sol";
import {GOO_PER_SEC, GOO_RESERVOIR_MAX} from "@ds/rules/ExtractionRule.sol";

using Schema for State;

uint8 constant MAX_CRAFT_INPUT_ITEMS = 4;
uint64 constant BLOCKS_TO_MAX_RESERVOIR = ((GOO_RESERVOIR_MAX * 100) / (GOO_PER_SEC * BLOCK_TIME_SECS) + 50) / 100;

bool constant ITEM_STACKABLE = true;
bool constant ITEM_EQUIPABLE = false;

contract MockCraftBuildingContract {
    function use(Game, /*ds*/ bytes24, /*buildingInstance*/ bytes24, /*mobileUnit*/ bytes memory /*payload*/ ) public {}
}

contract ExtractionRuleTest is Test {
    Game internal game;
    Dispatcher internal dispatcher;
    State internal state;

    uint64 sid;

    // accounts
    address aliceAccount;
    bytes24 aliceMobileUnit;

    // mock building implementation
    bytes24 mockBuildingKind;
    MockCraftBuildingContract mockBuildingContract;

    function setUp() public {
        // setup players
        uint256 alicePrivateKey = 0xA11CE;
        aliceAccount = vm.addr(alicePrivateKey);

        // setup allowlist
        address[] memory allowlist = new address[](1);
        allowlist[0] = aliceAccount;

        // setup game
        game = new DownstreamGame(allowlist);
        dispatcher = game.getDispatcher();

        // fetch the State to play with
        state = game.getState();

        // mobileUnits
        vm.startPrank(aliceAccount);
        aliceMobileUnit = _spawnMobileUnitWithResources(0, 0, 0);
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
        bytes24 buildingInstance = _constructBuildingInstance(mockBuildingKind, aliceMobileUnit, -1, 1, 0);
        vm.stopPrank();

        uint64 blockNum = state.getBlockNum(buildingInstance, 0);
        assertEq(uint64(block.number), blockNum, "Block number expected to be set on building instance");
    }

    function testExtractionFailureNoElapsedTime() public {
        vm.startPrank(aliceAccount);
        bytes24 buildingInstance = _constructBuildingInstance(mockBuildingKind, aliceMobileUnit, -1, 1, 0);
        vm.stopPrank();

        // Expect to revert as no time has passed for exaction to have occured
        vm.startPrank(address(mockBuildingContract));
        vm.expectRevert("not enough green goo extracted to make item");
        dispatcher.dispatch(abi.encodeCall(Actions.EXTRACT, (buildingInstance)));
        vm.stopPrank();
    }

    function testExtractionFailureNoTileGoo() public {
        vm.startPrank(aliceAccount);
        bytes24 buildingInstance = _constructBuildingInstance(mockBuildingKind, aliceMobileUnit, -1, 1, 0);
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
        bytes24 buildingInstance = _constructBuildingInstance(mockBuildingKind, aliceMobileUnit, -1, 1, 0);
        vm.stopPrank();

        // forcibly set goo values onto the tile
        bytes24 tile = Node.Tile(0, -1, 1, 0);
        state.setTileAtomValues(tile, [uint64(255), uint64(0), uint64(0)]);

        // -- Move time forward to completely fill reservoir
        vm.roll(block.number + 200);

        // extract
        vm.startPrank(address(mockBuildingContract));
        dispatcher.dispatch(abi.encodeCall(Actions.EXTRACT, (buildingInstance)));
        vm.stopPrank();

        // check that output item now exists in outputBag slot 0
        bytes24 outputBag = state.getEquipSlot(buildingInstance, 0);
        (bytes24 expItem, uint64 expBalance) = state.getOutput(mockBuildingKind, 0);
        (bytes24 gotItem, uint64 gotBalance) = state.getItemSlot(outputBag, 0);
        assertEq(gotItem, expItem, "expected output slot to contain expected output item");
        assertEq(gotBalance, expBalance, "expected output balance match");

        // expect reservoir to be minus the cost of the item batch
        uint64[3] memory reservoirAtoms = state.getBuildingReservoirAtoms(buildingInstance);
        (uint32[3] memory outputItemAtoms, /*bool isStackable*/ ) = state.getItemStructure(expItem);

        assertEq(
            reservoirAtoms[GOO_GREEN],
            GOO_RESERVOIR_MAX - outputItemAtoms[GOO_GREEN] * expBalance,
            "expected total atomic value of output items to be taken from reservoir"
        );
    }

    // _spawnMobileUnitWithResources spawns a mobileUnit for the current sender at
    // 0,0,0 with 100 of each resource in an equiped bag
    function _spawnMobileUnitWithResources(uint64 g, uint64 b, uint64 r) private returns (bytes24) {
        sid++;
        bytes24 mobileUnit = Node.MobileUnit(sid);
        _discover(0, 0, 0);
        dispatcher.dispatch(abi.encodeCall(Actions.SPAWN_MOBILE_UNIT, (mobileUnit)));
        bytes24[] memory items = new bytes24[](3);
        items[0] = ItemUtils.GlassGreenGoo();
        items[1] = ItemUtils.BeakerBlueGoo();
        items[2] = ItemUtils.FlaskRedGoo();

        uint64[] memory balances = new uint64[](3);
        balances[0] = g;
        balances[1] = b;
        balances[2] = r;

        uint64 mobileUnitBag = uint64(uint256(keccak256(abi.encode(mobileUnit))));
        dispatcher.dispatch(
            abi.encodeCall(
                Actions.DEV_SPAWN_BAG,
                (mobileUnitBag, state.getOwnerAddress(mobileUnit), mobileUnit, 0, items, balances)
            )
        );

        return mobileUnit;
    }

    function _transferItem(
        bytes24 mobileUnit,
        bytes24[2] memory equipees,
        uint8[2] memory equipSlots,
        uint8[2] memory itemSlots,
        bytes24 bagID,
        uint64 qty
    ) private {
        dispatcher.dispatch(
            abi.encodeCall(Actions.TRANSFER_ITEM_MOBILE_UNIT, (mobileUnit, equipees, equipSlots, itemSlots, bagID, qty))
        );
    }

    function _registerBuildingKind(uint32 uid, address buildingContract) private returns (bytes24) {
        bytes24[4] memory defaultMaterialItem;
        defaultMaterialItem[0] = ItemUtils.GlassGreenGoo();
        defaultMaterialItem[1] = ItemUtils.BeakerBlueGoo();
        defaultMaterialItem[2] = ItemUtils.FlaskRedGoo();
        uint64[4] memory defaultMaterialQty;
        defaultMaterialQty[0] = 25;
        defaultMaterialQty[1] = 25;
        defaultMaterialQty[2] = 25;
        bytes24 buildingKind = Node.BuildingKind(uid, BuildingCategory.EXTRACTOR);
        string memory buildingName = "TestBuilding";

        bytes24[MAX_CRAFT_INPUT_ITEMS] memory inputItemIDs;
        uint64[MAX_CRAFT_INPUT_ITEMS] memory inputQtys;
        bytes24 outputItem = ItemUtils.GlassGreenGoo();
        uint64 outputQty = 10; // How many we can make in one extraction

        dispatcher.dispatch(
            abi.encodeCall(
                Actions.REGISTER_BUILDING_KIND,
                (
                    uid,
                    buildingName,
                    BuildingCategory.EXTRACTOR,
                    "model-name",
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

    function _discover(int16 q, int16 r, int16 s) private {
        dispatcher.dispatch(
            abi.encodeCall(
                Actions.DEV_SPAWN_TILE,
                (
                    BiomeKind.DISCOVERED,
                    q, // q
                    r, // r
                    s // s
                )
            )
        );
    }

    // _constructCraftingBuilding sets up and constructs a crafting building that
    function _constructBuildingInstance(bytes24 buildingKind, bytes24 mobileUnit, int16 q, int16 r, int16 s)
        private
        returns (bytes24 buildingInstance)
    {
        // discover an adjacent tile for our building site
        _discover(q, r, s);
        // get our building and give it the resources to construct
        buildingInstance = Node.Building(DEFAULT_ZONE, q, r, s);
        // magic 100 items into the construct slot
        bytes24 inputBag = Node.Bag(uint64(uint256(keccak256(abi.encode(buildingInstance)))));
        state.setEquipSlot(buildingInstance, 0, inputBag);
        state.setItemSlot(inputBag, 0, ItemUtils.GlassGreenGoo(), 25);
        state.setItemSlot(inputBag, 1, ItemUtils.BeakerBlueGoo(), 25);
        state.setItemSlot(inputBag, 2, ItemUtils.FlaskRedGoo(), 25);
        // construct our building
        dispatcher.dispatch(abi.encodeCall(Actions.CONSTRUCT_BUILDING_MOBILE_UNIT, (mobileUnit, buildingKind, q, r, s)));
        return buildingInstance;
    }
}

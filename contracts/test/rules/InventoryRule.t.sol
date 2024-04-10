// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "../helpers/GameTest.sol";
import "@ds/rules/InventoryRule.sol";
import {BuildingKind} from "@ds/ext/BuildingKind.sol";

using Schema for State;

uint8 constant EQUIP_SLOT_0 = 0;
uint8 constant EQUIP_SLOT_1 = 1;

uint8 constant ITEM_SLOT_0 = 0;
uint8 constant ITEM_SLOT_1 = 1;

uint64 constant BUILDING_KIND_ID_1 = 20;
uint64 constant BUILDING_KIND_ID_2 = 21;

contract MockBuildingKind is BuildingKind {
    function use(Game game, bytes24 building, bytes24 mobileUnit, bytes memory payload) public override {}
}

contract InventoryRuleTest is Test, GameTest {
    bytes24[4] defaultMaterialItem;
    uint64[4] defaultMaterialQty;

    function setUp() public {
        dev.spawnTile(0, 0, 0, 0);
        dev.spawnTile(0, 1, 0, -1);
        dev.spawnTile(0, 2, 0, -2);
        dev.spawnTile(0, 3, 0, -3);

        // setup default material construction costs
        defaultMaterialItem[0] = ItemUtils.GreenGoo();
        defaultMaterialItem[1] = ItemUtils.BlueGoo();
        defaultMaterialItem[2] = ItemUtils.RedGoo();
        defaultMaterialQty[0] = 25;
        defaultMaterialQty[1] = 25;
        defaultMaterialQty[2] = 25;
    }

    function testTransferItemMobileUnitBagToMobileUnitBag() public {
        vm.startPrank(players[0].addr);
        bytes24 mobileUnit = _spawnMobileUnit(players[0].addr, 0, 0, 0, 0);
        _testTransferItemBetweenEquipees(
            mobileUnit, // mobileUnit perfoming the action
            mobileUnit, // location of from-bag
            mobileUnit // location to to-bag
        );
        vm.stopPrank();
    }

    function testTransferItemBuildingBagToMobileUnitBag() public {
        vm.startPrank(players[0].addr);
        bytes24 mobileUnit = _spawnMobileUnitWithResources(players[0].addr);
        (bytes24 buildingInstance, address buildingImplementation) =
            _constructBuilding(players[0].addr, BUILDING_KIND_ID_1, mobileUnit, 0, 1, -1, 0);
        vm.stopPrank();

        vm.startPrank(buildingImplementation);
        _testTransferItemBetweenEquipees(
            buildingInstance, // building perfoming the action
            buildingInstance, // building owner of from-bag
            mobileUnit // location to to-bag
        );
        vm.stopPrank();
    }

    function testTransferItemMobileUnitBagToTileBag() public {
        vm.startPrank(players[0].addr);
        bytes24 mobileUnit = _spawnMobileUnit(players[0].addr, 0, 0, 0, 0);
        bytes24 tile = Node.Tile(0, 0, 0, 0);
        _testTransferItemBetweenEquipees(
            mobileUnit, // mobileUnit perfoming the action
            mobileUnit, // location of from-bag
            tile // location to to-bag
        );
        vm.stopPrank();
    }

    function testTransferItemBuildingBagToTileBag() public {
        vm.startPrank(players[0].addr);
        bytes24 mobileUnit = _spawnMobileUnitWithResources(players[0].addr);
        (bytes24 buildingInstance, address buildingImplementation) =
            _constructBuilding(players[0].addr, BUILDING_KIND_ID_1, mobileUnit, 0, 1, -1, 0);
        bytes24 tile = Node.Tile(0, 0, 0, 0);
        vm.stopPrank();

        vm.startPrank(buildingImplementation);
        _testTransferItemBetweenEquipees(
            buildingInstance, // mobileUnit perfoming the action
            buildingInstance, // location of from-bag
            tile // location to to-bag
        );
        vm.stopPrank();
    }

    function testTransferItemTileBagToTileBag() public {
        vm.startPrank(players[0].addr);
        bytes24 mobileUnit = _spawnMobileUnit(players[0].addr, 0, 0, 0, 0);
        bytes24 tile = Node.Tile(0, 0, 0, 0);
        _testTransferItemBetweenEquipees(
            mobileUnit, // mobileUnit perfoming the action
            tile, // location of from-bag
            tile // location to to-bag
        );
        vm.stopPrank();
    }

    function testTransferItemMobileUnitBagToBuildingBagNotAtOrigin() public {
        vm.startPrank(players[0].addr);
        bytes24 mobileUnit = _spawnMobileUnit(players[0].addr, 0, 2, 0, -2);
        (int16 z, int16 q, int16 r, int16 s) = (0, 3, 0, -3);
        bytes24 buildingInstance = Node.Building(z, q, r, s);
        bytes24 bag = Node.Bag(uint64(uint256(keccak256(abi.encode(buildingInstance)))));
        _testTransferItemBetweenEquipeesWithBag(
            mobileUnit, // mobileUnit perfoming the action
            mobileUnit, // location of from-bag
            buildingInstance, // location to to-bag
            bag // building bag to create
        );
        vm.stopPrank();
    }

    function testTransferItemBuildingBagNotAtOriginToMobileUnit() public {
        vm.startPrank(players[0].addr);
        bytes24 mobileUnit = _spawnMobileUnitWithResources(players[0].addr);
        moveMobileUnit(0, 2, 0, -2);
        (int16 z, int16 q, int16 r, int16 s) = (0, 3, 0, -3);
        (bytes24 buildingInstance, address buildingImplementation) =
            _constructBuilding(players[0].addr, BUILDING_KIND_ID_1, mobileUnit, z, q, r, s);
        vm.stopPrank();

        vm.startPrank(buildingImplementation);
        _testTransferItemBetweenEquipees(
            buildingInstance, // mobileUnit perfoming the action
            buildingInstance, // location of from-bag
            mobileUnit // location to to-bag
        );
        vm.stopPrank();
    }

    function testTransferItemFailNotOwner() public {
        vm.startPrank(players[0].addr);
        bytes24 mobileUnit = _spawnMobileUnit(players[0].addr, 0, 0, 0, 0);
        vm.stopPrank();

        vm.startPrank(players[1].addr); // bob trying to use alice's mobileUnit
        _testTransferItemFailBetweenEquipees(
            mobileUnit, // mobileUnit perfoming the action
            mobileUnit, // location of from-bag
            mobileUnit, // location to to-bag
            "NoTransferPlayerNotOwner" // expect this error cos sender is not mobileUnit owner
        );
        vm.stopPrank();
    }

    function testTransferItemFailNotBuildingImplementer() public {
        vm.startPrank(players[0].addr);
        bytes24 mobileUnit = _spawnMobileUnitWithResources(players[0].addr);
        (bytes24 buildingInstance,) = _constructBuilding(players[0].addr, BUILDING_KIND_ID_1, mobileUnit, 0, 1, -1, 0);

        // pranked sender is still the player

        _testTransferItemFailBetweenEquipees(
            buildingInstance, // mobile unitperfoming the action
            buildingInstance, // building owner of from-bag
            mobileUnit, // location to to-bag
            "NoTransferSenderNotBuildingContract" // expect this error cos sender is not mobileUnit owner
        );
        vm.stopPrank();
    }

    function testTransferItemFailNotSameLocationMobileUnit() public {
        vm.startPrank(players[0].addr);
        bytes24 mobileUnit1 = _spawnMobileUnit(players[0].addr, 0, 0, 0, 0);
        vm.stopPrank();
        vm.startPrank(players[1].addr);
        bytes24 mobileUnit2 = _spawnMobileUnit(players[1].addr, 0, 3, 0, -3);
        vm.stopPrank();

        vm.startPrank(players[0].addr);
        _testTransferItemFailBetweenEquipees(
            mobileUnit1, // mobileUnit perfoming the action
            mobileUnit1, // location of from-bag
            mobileUnit2, // location to to-bag
            "NoTransferNotSameLocation" // expect this error cos mobileUnit1 and mobileUnit2 diff locations
        );
        vm.stopPrank();
    }

    function testTransferItemFailNotSameLocationTile() public {
        vm.startPrank(players[0].addr);
        bytes24 mobileUnit1 = _spawnMobileUnit(players[0].addr, 0, 0, 0, 0);
        bytes24 tile = Node.Tile(0, 3, 0, -3);
        _testTransferItemFailBetweenEquipees(
            mobileUnit1, // mobileUnit perfoming the action
            mobileUnit1, // location of from-bag
            tile, // location to to-bag
            "NoTransferNotSameLocation" // expect this error cos tile not same location as mobileUnit
        );
        vm.stopPrank();
    }

    function testTransferItemFailNotYourBag() public {
        vm.startPrank(players[1].addr);
        bytes24 mobileUnitStranger = _spawnMobileUnit(players[0].addr, 0, 0, 0, 0);
        vm.stopPrank();
        vm.startPrank(players[0].addr);
        bytes24 mobileUnitAlice = _spawnMobileUnit(players[0].addr, 0, 0, 0, 0);
        _spawnBagWithWood(
            address(1), // stranger's bag
            mobileUnitStranger,
            EQUIP_SLOT_0
        );
        _spawnBagEmpty(players[0].addr, mobileUnitAlice, EQUIP_SLOT_1);

        uint8[2] memory equipSlots = [EQUIP_SLOT_0, EQUIP_SLOT_1];
        uint8[2] memory itemSlots = [ITEM_SLOT_0, ITEM_SLOT_0];

        // as alice, try to steal from stranger's bag
        vm.expectRevert("NoTransferNotYourBag");
        transferItem(
            mobileUnitAlice,
            [mobileUnitStranger, mobileUnitAlice], // where are bags equipt
            equipSlots, // which equipment slots
            itemSlots, // item slots
            0,
            50 // amount to xfer
        );
        vm.stopPrank();
    }

    function testTransferItemFailNotBuildingBag() public {
        vm.startPrank(players[0].addr);
        bytes24 mobileUnit = _spawnMobileUnitWithResources(players[0].addr);
        (bytes24 buildingInstance, address buildingImplementation) =
            _constructBuilding(players[0].addr, BUILDING_KIND_ID_1, mobileUnit, 0, 1, -1, 0);
        vm.stopPrank();

        vm.startPrank(buildingImplementation);
        _testTransferItemFailBetweenEquipees(
            buildingInstance, // building perfoming the action
            mobileUnit, // building owner of from-bag
            mobileUnit, // location to to-bag
            "NoTransferNotYourBag"
        );
        vm.stopPrank();
    }

    function testTransferItemFailIncompatibleSlot() public {
        vm.startPrank(players[0].addr);
        bytes24 mobileUnit = _spawnMobileUnit(players[0].addr, 0, 0, 0, 0);
        _spawnBagWithWood(players[0].addr, mobileUnit, EQUIP_SLOT_0);
        _spawnBagWithStone(players[0].addr, mobileUnit, EQUIP_SLOT_1);

        uint8[2] memory equipSlots = [EQUIP_SLOT_0, EQUIP_SLOT_1];
        uint8[2] memory itemSlots = [ITEM_SLOT_0, ITEM_SLOT_0];

        vm.expectRevert("NoTransferIncompatibleSlot"); // should fail cos can't stack wood on stone
        transferItem(
            mobileUnit,
            [mobileUnit, mobileUnit], // where are bags equipt
            equipSlots, // which equipment slots
            itemSlots, // item slots
            0,
            50 // amount to xfer
        );
        vm.stopPrank();
    }

    function testTransferItemFailSameSlot() public {
        vm.startPrank(players[0].addr);
        bytes24 mobileUnit = _spawnMobileUnit(players[0].addr, 0, 0, 0, 0);
        _spawnBagWithWood(players[0].addr, mobileUnit, EQUIP_SLOT_0);
        _spawnBagWithStone(players[0].addr, mobileUnit, EQUIP_SLOT_1);

        uint8[2] memory equipSlots = [EQUIP_SLOT_1, EQUIP_SLOT_1];
        uint8[2] memory itemSlots = [ITEM_SLOT_0, ITEM_SLOT_0];

        vm.expectRevert("NoTransferSameSlot"); // should fail cos can't xfer to same slot
        transferItem(
            mobileUnit,
            [mobileUnit, mobileUnit], // where are bags equipt
            equipSlots, // which equipment slots
            itemSlots, // item slots
            0,
            50 // amount to xfer
        );
        vm.stopPrank();
    }

    function testTransferItemFailLowBalance() public {
        vm.startPrank(players[0].addr);
        bytes24 mobileUnit = _spawnMobileUnit(players[0].addr, 0, 0, 0, 0);
        _spawnBagWithWood(players[0].addr, mobileUnit, EQUIP_SLOT_0);
        _spawnBagEmpty(players[0].addr, mobileUnit, EQUIP_SLOT_1);

        uint8[2] memory equipSlots = [EQUIP_SLOT_0, EQUIP_SLOT_1];
        uint8[2] memory itemSlots = [ITEM_SLOT_0, ITEM_SLOT_0];

        vm.expectRevert("NoTransferLowBalance"); // should fail cos we don't have 999 balance
        transferItem(
            mobileUnit,
            [mobileUnit, mobileUnit], // where are bags equipt
            equipSlots, // which equipment slots
            itemSlots, // item slots
            0,
            999 // way too much
        );
        vm.stopPrank();
    }

    function _testTransferItemFailBetweenEquipees(
        bytes24 mobileUnit,
        bytes24 fromEquipee,
        bytes24 toEquipee,
        string memory expectedError
    ) private {
        // equip two bags to mobileUnit
        bytes24 fromBag;
        if (bytes4(fromEquipee) == Kind.Building.selector) {
            fromBag = state.getEquipSlot(fromEquipee, 0);
        } else {
            fromBag = _spawnBagWithWood(players[0].addr, fromEquipee, EQUIP_SLOT_0);
        }
        bytes24 toBag = _spawnBagEmpty(players[0].addr, toEquipee, EQUIP_SLOT_1);
        // confirm bag1 has 100 wood
        (bytes24 fromResourceBefore, uint64 fromBalanceBefore) = state.getItemSlot(fromBag, ITEM_SLOT_0);
        (bytes24 toResourceBefore, uint64 toBalanceBefore) = state.getItemSlot(toBag, ITEM_SLOT_0);
        assertEq(
            fromResourceBefore,
            ItemUtils.GreenGoo(),
            "expected mobileUnit1-equip0-bag-item0 (from) resource to be wood before xfer"
        );
        assertEq(toResourceBefore, 0x0, "expected mobileUnit1-equip1-bag-item0 (to) resource to be unset before xfer");
        assertEq(fromBalanceBefore, 100, "expected mobileUnit1-equip1-bag-item0 balance to be 100 before xfer");
        assertEq(toBalanceBefore, 0, "expected mobileUnit1-equip1-bag-item0 balance to be 0 before xfer");

        uint8[2] memory equipSlots = [EQUIP_SLOT_0, EQUIP_SLOT_1];
        uint8[2] memory itemSlots = [ITEM_SLOT_0, ITEM_SLOT_0];

        // perform xfer as alice
        vm.expectRevert(bytes(expectedError));
        transferItem(
            mobileUnit,
            [fromEquipee, toEquipee], // where are bags equipt
            equipSlots, // which equipment slots
            itemSlots, // item slots
            0,
            50 // amount to xfer
        );
    }

    function _testTransferItemBetweenEquipees(bytes24 mobileUnit, bytes24 fromEquipee, bytes24 toEquipee) private {
        _testTransferItemBetweenEquipeesWithBag(mobileUnit, fromEquipee, toEquipee, bytes24(0));
    }

    function _testTransferItemBetweenEquipeesWithBag(
        bytes24 mobileUnit,
        bytes24 fromEquipee,
        bytes24 toEquipee,
        bytes24 bag
    ) private {
        // equip two bags to mobileUnit
        bytes24 fromBag;
        if (bytes4(fromEquipee) == Kind.Building.selector) {
            fromBag = state.getEquipSlot(fromEquipee, 0);
        } else {
            fromBag = _spawnBagWithWood(players[0].addr, fromEquipee, EQUIP_SLOT_0);
        }
        bytes24 toBag = _spawnBagEmpty(players[0].addr, toEquipee, EQUIP_SLOT_1);
        // confirm bag1 has 100 wood
        (bytes24 fromResourceBefore, uint64 fromBalanceBefore) = state.getItemSlot(fromBag, ITEM_SLOT_0);
        (bytes24 toResourceBefore, uint64 toBalanceBefore) = state.getItemSlot(toBag, ITEM_SLOT_0);
        assertEq(
            fromResourceBefore,
            ItemUtils.GreenGoo(),
            "expected mobileUnit1-equip0-bag-item0 (from) resource to be wood before xfer"
        );
        assertEq(toResourceBefore, 0x0, "expected mobileUnit1-equip1-bag-item0 (to) resource to be unset before xfer");
        assertEq(fromBalanceBefore, 100, "expected mobileUnit1-equip1-bag-item0 balance to be 100 before xfer");
        assertEq(toBalanceBefore, 0, "expected mobileUnit1-equip1-bag-item0 balance to be 0 before xfer");

        uint8[2] memory equipSlots = [EQUIP_SLOT_0, EQUIP_SLOT_1];
        uint8[2] memory itemSlots = [ITEM_SLOT_0, ITEM_SLOT_0];

        // perform xfer as alice
        transferItem(
            mobileUnit,
            [fromEquipee, toEquipee], // where are bags equipt
            equipSlots, // which equipment slots
            itemSlots, // item slots
            bag,
            50 // amount to xfer
        );

        // confirm bag2 has 50 wood after xfer
        (bytes24 fromResourceAfter, uint64 fromBalanceAfter) = state.getItemSlot(fromBag, itemSlots[0]);
        (bytes24 toResourceAfter, uint64 toBalanceAfter) = state.getItemSlot(toBag, itemSlots[1]);
        assertEq(
            fromResourceAfter,
            ItemUtils.GreenGoo(),
            "expected mobileUnit1-equip0-bag-item0 resource to be wood after xfer"
        );
        assertEq(
            toResourceAfter,
            ItemUtils.GreenGoo(),
            "expected mobileUnit1-equip1-bag-item0 resource to be wood after xfer"
        );
        assertEq(fromBalanceAfter, 50, "expected mobileUnit1-equip1-bag-item0 balance to decrease to 50 after xfer");
        assertEq(toBalanceAfter, 50, "expected mobileUnit1-equip1-bag-item0 balance to increase to 50 after xfer");
    }

    function testTransferItemBetweenEquipeeAndMissingBag() public {
        vm.startPrank(players[0].addr);
        bytes24 mobileUnit = _spawnMobileUnit(players[0].addr, 0, 0, 0, 0);
        bytes24 fromEquipee = mobileUnit;

        // equip two bags to mobileUnit
        bytes24 fromBag = _spawnBagWithWood(players[0].addr, fromEquipee, EQUIP_SLOT_0);

        bytes24 buildingInstance = Node.Building(0, 0, 0, 0);
        bytes24 toBag = Node.Bag(uint64(uint256(keccak256(abi.encode(buildingInstance)))));
        bytes24 toEquipee = buildingInstance;

        // confirm bag1 has 100 wood
        (bytes24 fromResourceBefore, uint64 fromBalanceBefore) = state.getItemSlot(fromBag, ITEM_SLOT_0);
        (bytes24 toResourceBefore, uint64 toBalanceBefore) = state.getItemSlot(toBag, ITEM_SLOT_0);
        assertEq(
            fromResourceBefore,
            ItemUtils.GreenGoo(),
            "expected mobileUnit1-equip0-bag-item0 (from) resource to be wood before xfer"
        );
        assertEq(toResourceBefore, 0x0, "expected mobileUnit1-equip1-bag-item0 (to) resource to be unset before xfer");
        assertEq(fromBalanceBefore, 100, "expected mobileUnit1-equip1-bag-item0 balance to be 100 before xfer");
        assertEq(toBalanceBefore, 0, "expected mobileUnit1-equip1-bag-item0 balance to be 0 before xfer");

        uint8[2] memory equipSlots = [EQUIP_SLOT_0, EQUIP_SLOT_1];
        uint8[2] memory itemSlots = [ITEM_SLOT_0, ITEM_SLOT_0];

        // perform xfer as alice
        transferItem(
            mobileUnit,
            [fromEquipee, toEquipee], // where are bags equipt
            equipSlots, // which equipment slots
            itemSlots, // item slots
            toBag,
            50 // amount to xfer
        );
        vm.stopPrank();

        // confirm bag2 has 50 wood after xfer
        (bytes24 fromResourceAfter, uint64 fromBalanceAfter) = state.getItemSlot(fromBag, itemSlots[0]);
        (bytes24 toResourceAfter, uint64 toBalanceAfter) = state.getItemSlot(toBag, itemSlots[1]);
        assertEq(
            fromResourceAfter,
            ItemUtils.GreenGoo(),
            "expected mobileUnit1-equip0-bag-item0 resource to be wood after xfer"
        );
        assertEq(
            toResourceAfter,
            ItemUtils.GreenGoo(),
            "expected mobileUnit1-equip1-bag-item0 resource to be wood after xfer"
        );
        assertEq(fromBalanceAfter, 50, "expected mobileUnit1-equip1-bag-item0 balance to decrease to 50 after xfer");
        assertEq(toBalanceAfter, 50, "expected mobileUnit1-equip1-bag-item0 balance to increase to 50 after xfer");
    }

    function testExport() public {
        _testExport();
    }

    function _testExport() internal returns (bytes24 fromEquipee) {
        vm.startPrank(players[0].addr);
        fromEquipee = _spawnMobileUnit(players[0].addr, 0, 0, 0, 0);
        uint8 fromEquipSlot = EQUIP_SLOT_0;
        uint8 fromItemSlot = ITEM_SLOT_0;
        uint64 qty = 2;
        bytes24 fromBag = _spawnBagWithWood(players[0].addr, fromEquipee, fromEquipSlot);
        address toAddress = players[0].addr;

        // confirm balance before
        (bytes24 fromResourceBefore, uint64 fromBalanceBefore) = state.getItemSlot(fromBag, ITEM_SLOT_0);
        assertEq(fromResourceBefore, ItemUtils.GreenGoo(), "expected green goo to start");
        assertEq(fromBalanceBefore, 100, "expected 100 green goo to start");

        // export it
        dispatcher.dispatch(
            abi.encodeCall(Actions.EXPORT_ITEM, (fromEquipee, fromEquipSlot, fromItemSlot, toAddress, qty))
        );

        vm.stopPrank();

        // confirm player addr has expected ERC1155 balance of green goo
        uint256 walletBalance = tokens.balanceOf(toAddress, uint256(uint192(ItemUtils.GreenGoo())));
        assertEq(walletBalance, 2, "expected player to have a balance of 2 ERC1155 GreeGoo");

        // confirm unit balance decremented
        (bytes24 fromResourceAfter, uint64 fromBalanceAfter) = state.getItemSlot(fromBag, ITEM_SLOT_0);
        assertEq(fromResourceAfter, ItemUtils.GreenGoo(), "expected green goo to end");
        assertEq(fromBalanceAfter, 98, "expected 98 green goo to end");
    }

    function testImport() public {
        // do export first
        bytes24 fromEquipee = _testExport();
        bytes24 fromBag = state.getEquipSlot(fromEquipee, EQUIP_SLOT_0);

        // confirm balance before
        (bytes24 fromResourceBefore, uint64 fromBalanceBefore) = state.getItemSlot(fromBag, ITEM_SLOT_0);
        assertEq(fromResourceBefore, ItemUtils.GreenGoo(), "expected green goo to start");
        assertEq(fromBalanceBefore, 98, "expected 98 green goo to start");

        // import item back again
        vm.startPrank(players[0].addr);
        dispatcher.dispatch(
            abi.encodeCall(Actions.IMPORT_ITEM, (ItemUtils.GreenGoo(), fromEquipee, EQUIP_SLOT_0, ITEM_SLOT_0, 1))
        );
        vm.stopPrank();

        // confirm player addr has expected ERC1155 balance of green goo
        uint256 walletBalance = tokens.balanceOf(players[0].addr, uint256(uint192(ItemUtils.GreenGoo())));
        assertEq(walletBalance, 1, "expected player to have a balance of 1 ERC1155 GreeGoo");

        // confirm unit balance incremeneted
        (bytes24 fromResourceAfter, uint64 fromBalanceAfter) = state.getItemSlot(fromBag, ITEM_SLOT_0);
        assertEq(fromResourceAfter, ItemUtils.GreenGoo(), "expected green goo to end");
        assertEq(fromBalanceAfter, 99, "expected 99 green goo to end");
    }

    function _spawnBagWithWood(address owner, bytes24 equipNode, uint8 equipSlot) private returns (bytes24) {
        bytes24[] memory items = new bytes24[](1);
        items[0] = ItemUtils.GreenGoo();
        uint64[] memory balances = new uint64[](1);
        balances[0] = 100;
        return dev.spawnBag(owner, equipNode, equipSlot, items, balances);
    }

    function _spawnBagWithStone(address owner, bytes24 equipNode, uint8 equipSlot) private returns (bytes24) {
        bytes24[] memory items = new bytes24[](1);
        items[0] = ItemUtils.BlueGoo();
        uint64[] memory balances = new uint64[](1);
        balances[0] = 100;
        return dev.spawnBag(owner, equipNode, equipSlot, items, balances);
    }

    function _spawnBagEmpty(address owner, bytes24 equipNode, uint8 equipSlot) private returns (bytes24) {
        bytes24[] memory items = new bytes24[](0);
        uint64[] memory balances = new uint64[](0);
        return dev.spawnBag(owner, equipNode, equipSlot, items, balances);
    }

    function _spawnMobileUnit(address player, int16 z, int16 q, int16 r, int16 s) private returns (bytes24) {
        bytes24 mobileUnit = Node.MobileUnit(player);
        spawnMobileUnit();
        moveMobileUnit(z, q, r, s);
        vm.roll(block.number + 100);
        return mobileUnit;
    }

    function _transferFromMobileUnitToBuilding(
        bytes24 mobileUnit,
        uint8 bag,
        uint8 slot,
        uint64 qty,
        bytes24 toBuilding
    ) private {
        bytes24 buildingBag = Node.Bag(uint64(uint256(keccak256(abi.encode(toBuilding)))));
        dispatcher.dispatch(
            abi.encodeCall(
                Actions.TRANSFER_ITEM_MOBILE_UNIT,
                (mobileUnit, [mobileUnit, toBuilding], [bag, 0], [slot, slot], buildingBag, qty)
            )
        );
    }

    // _spawnMobileUnitWithResources spawns a mobileUnit for the current sender at
    // 0,0,0 with 100 of each resource in an equiped bag
    function _spawnMobileUnitWithResources(address player) private returns (bytes24) {
        dev.spawnTile(0, 0, 0, 0);
        bytes24 mobileUnit = Node.MobileUnit(player);
        spawnMobileUnit();
        dev.spawnFullBag(state.getOwnerAddress(mobileUnit), mobileUnit, 0);
        dev.spawnFullBag(state.getOwnerAddress(mobileUnit), mobileUnit, 1);

        return mobileUnit;
    }

    function _registerBuildingKind(uint64 kindId) private returns (bytes24, address) {
        // register a building kind
        bytes24 buildingKind = Node.BuildingKind(kindId);
        string memory buildingName = "inventory test building";
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

        // register a mock implementation for the building
        MockBuildingKind buildingImplementation = new MockBuildingKind();
        dispatcher.dispatch(
            abi.encodeCall(Actions.REGISTER_KIND_IMPLEMENTATION, (buildingKind, address(buildingImplementation)))
        );
        return (buildingKind, address(buildingImplementation));
    }

    function _constructWithBuildingKind(
        address builderAccount,
        bytes24 buildingKind,
        bytes24 mobileUnit,
        int16 z,
        int16 q,
        int16 r,
        int16 s
    ) private returns (bytes24) {
        // get our building and give it the resources to construct
        bytes24 buildingInstance = Node.Building(z, q, r, s);
        // construct our building
        _transferFromMobileUnitToBuilding(mobileUnit, 0, 0, 25, buildingInstance);
        _transferFromMobileUnitToBuilding(mobileUnit, 0, 1, 25, buildingInstance);
        _transferFromMobileUnitToBuilding(mobileUnit, 0, 2, 25, buildingInstance);
        dispatcher.dispatch(abi.encodeCall(Actions.CONSTRUCT_BUILDING_MOBILE_UNIT, (buildingKind, z, q, r, s)));

        // put some extra goo in bag 0 for transfer testing
        _transferFromMobileUnitToBuilding(mobileUnit, 1, 0, 100, buildingInstance);

        // check the building has a location at q/r/s
        assertEq(state.getFixedLocation(buildingInstance), Node.Tile(z, q, r, s), "expected building to have location");
        // check building has owner
        assertEq(
            state.getOwner(buildingInstance),
            Node.Player(builderAccount),
            "expected building to be owned by builder acccount"
        );

        // check building has kind
        assertEq(state.getBuildingKind(buildingInstance), buildingKind, "expected building to have kind");
        // check building has a bag equip
        bytes24 bag0 = state.getEquipSlot(buildingInstance, 0);
        assertTrue(bag0 != 0x0, "expected building to have a bag equip");
        // check it has some goo
        (, uint64 balance) = state.getItemSlot(bag0, 0);
        assertTrue(balance == 100, "expected building to have some goo");

        return buildingInstance;
    }

    function _constructBuilding(
        address builderAccount,
        uint64 kindId,
        bytes24 mobileUnit,
        int16 z,
        int16 q,
        int16 r,
        int16 s
    ) private returns (bytes24, address) {
        // register a building kind
        (bytes24 buildingKind, address buildingImplementation) = _registerBuildingKind(kindId);
        bytes24 buildingInstance = _constructWithBuildingKind(builderAccount, buildingKind, mobileUnit, z, q, r, s);

        return (buildingInstance, address(buildingImplementation));
    }
}

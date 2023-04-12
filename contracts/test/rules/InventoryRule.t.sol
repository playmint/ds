// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";

import {State} from "cog/State.sol";
import {Dispatcher} from "cog/Dispatcher.sol";

import {Game} from "@ds/Game.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {Schema, Node, Rel, LocationKey, BiomeKind, ResourceKind, DEFAULT_ZONE} from "@ds/schema/Schema.sol";
import "@ds/rules/InventoryRule.sol";

using Schema for State;

uint32 constant TEST_SEEKER_ID = 1;

uint8 constant EQUIP_SLOT_0 = 0;
uint8 constant EQUIP_SLOT_1 = 1;

uint8 constant ITEM_SLOT_0 = 0;
uint8 constant ITEM_SLOT_1 = 1;

contract InventoryRuleTest is Test {
    Game internal game;
    Dispatcher internal dispatcher;
    State internal state;

    // accounts
    address aliceAccount;

    function setUp() public {
        // setup game
        game = new Game();
        dispatcher = game.getDispatcher();

        // fetch the State to play with
        state = game.getState();

        // setup users
        uint256 alicePrivateKey = 0xA11CE;
        aliceAccount = vm.addr(alicePrivateKey);
    }

    function testTransferItemSeekerBagToSeekerBag() public {
        bytes24 seeker = _spawnSeeker(aliceAccount, 1, 0, 0, 0);
        _testTransferItemBetweenEquipees(
            seeker, // seeker perfoming the action
            seeker, // location of from-bag
            seeker // location to to-bag
        );
    }

    function testTransferItemSeekerBagToTileBag() public {
        bytes24 seeker = _spawnSeeker(aliceAccount, 1, 0, 0, 0);
        bytes24 tile = Node.Tile(DEFAULT_ZONE, 0, 0, 0);
        _testTransferItemBetweenEquipees(
            seeker, // seeker perfoming the action
            seeker, // location of from-bag
            tile // location to to-bag
        );
    }

    function testTransferItemTileBagToTileBag() public {
        bytes24 seeker = _spawnSeeker(aliceAccount, 1, 0, 0, 0);
        bytes24 tile = Node.Tile(DEFAULT_ZONE, 0, 0, 0);
        _testTransferItemBetweenEquipees(
            seeker, // seeker perfoming the action
            tile, // location of from-bag
            tile // location to to-bag
        );
    }

    function testTransferItemFailNotOwner() public {
        bytes24 seeker = _spawnSeeker(aliceAccount, 1, 0, 0, 0);
        _testTransferItemFailBetweenEquipees(
            address(1), // send as a stranger
            seeker, // seeker perfoming the action
            seeker, // location of from-bag
            seeker, // location to to-bag
            NoTransferPlayerNotOwner.selector // expect this error cos sender is not seeker owner
        );
    }

    function testTransferItemFailNotSameLocationSeeker() public {
        bytes24 seeker1 = _spawnSeeker(aliceAccount, 1, 0, 0, 0);
        bytes24 seeker2 = _spawnSeeker(aliceAccount, 2, 0, 1, -1);
        _testTransferItemFailBetweenEquipees(
            aliceAccount, // send as a stranger
            seeker1, // seeker perfoming the action
            seeker1, // location of from-bag
            seeker2, // location to to-bag
            NoTransferNotSameLocation.selector // expect this error cos seeker1 and seeker2 diff locations
        );
    }

    function testTransferItemFailNotSameLocationTile() public {
        bytes24 seeker1 = _spawnSeeker(aliceAccount, 1, 0, 0, 0);
        bytes24 tile = Node.Tile(DEFAULT_ZONE, 0, 1, -1);
        _testTransferItemFailBetweenEquipees(
            aliceAccount, // send as a stranger
            seeker1, // seeker perfoming the action
            seeker1, // location of from-bag
            tile, // location to to-bag
            NoTransferNotSameLocation.selector // expect this error cos tile not same location as seeker
        );
    }

    function testTransferItemFailNotYourBag() public {
        bytes24 seekerAlice = _spawnSeeker(aliceAccount, 1, 0, 0, 0);
        bytes24 seekerStranger = _spawnSeeker(aliceAccount, 1, 0, 0, 0);
        _spawnBagWithWood(
            1,
            address(1), // stranger's bag
            seekerStranger,
            EQUIP_SLOT_0
        );
        _spawnBagEmpty(2, aliceAccount, seekerAlice, EQUIP_SLOT_1);

        uint8[2] memory equipSlots = [EQUIP_SLOT_0, EQUIP_SLOT_1];
        uint8[2] memory itemSlots = [ITEM_SLOT_0, ITEM_SLOT_0];

        // as alice, try to steal from stranger's bag
        vm.startPrank(aliceAccount);
        vm.expectRevert(NoTransferNotYourBag.selector);
        _transferItem(
            seekerAlice,
            [seekerStranger, seekerAlice], // where are bags equipt
            equipSlots, // which equipment slots
            itemSlots, // item slots
            50 // amount to xfer
        );
        vm.stopPrank();
    }

    function testTransferItemFailIncompatibleSlot() public {
        bytes24 seeker = _spawnSeeker(aliceAccount, 1, 0, 0, 0);
        _spawnBagWithWood(1, aliceAccount, seeker, EQUIP_SLOT_0);
        _spawnBagWithStone(2, aliceAccount, seeker, EQUIP_SLOT_1);

        uint8[2] memory equipSlots = [EQUIP_SLOT_0, EQUIP_SLOT_1];
        uint8[2] memory itemSlots = [ITEM_SLOT_0, ITEM_SLOT_0];

        vm.startPrank(aliceAccount);
        vm.expectRevert(NoTransferIncompatibleSlot.selector); // should fail cos can't stack wood on stone
        _transferItem(
            seeker,
            [seeker, seeker], // where are bags equipt
            equipSlots, // which equipment slots
            itemSlots, // item slots
            50 // amount to xfer
        );
        vm.stopPrank();
    }

    function testTransferItemFailSameSlot() public {
        bytes24 seeker = _spawnSeeker(aliceAccount, 1, 0, 0, 0);
        _spawnBagWithWood(1, aliceAccount, seeker, EQUIP_SLOT_0);
        _spawnBagWithStone(2, aliceAccount, seeker, EQUIP_SLOT_1);

        uint8[2] memory equipSlots = [EQUIP_SLOT_1, EQUIP_SLOT_1];
        uint8[2] memory itemSlots = [ITEM_SLOT_0, ITEM_SLOT_0];

        vm.startPrank(aliceAccount);
        vm.expectRevert(NoTransferSameSlot.selector); // should fail cos can't xfer to same slot
        _transferItem(
            seeker,
            [seeker, seeker], // where are bags equipt
            equipSlots, // which equipment slots
            itemSlots, // item slots
            50 // amount to xfer
        );
        vm.stopPrank();
    }

    function testTransferItemFailLowBalance() public {
        bytes24 seeker = _spawnSeeker(aliceAccount, 1, 0, 0, 0);
        _spawnBagWithWood(1, aliceAccount, seeker, EQUIP_SLOT_0);
        _spawnBagEmpty(2, aliceAccount, seeker, EQUIP_SLOT_1);

        uint8[2] memory equipSlots = [EQUIP_SLOT_0, EQUIP_SLOT_1];
        uint8[2] memory itemSlots = [ITEM_SLOT_0, ITEM_SLOT_0];

        vm.startPrank(aliceAccount);
        vm.expectRevert(NoTransferLowBalance.selector); // should fail cos we don't have 999 balance
        _transferItem(
            seeker,
            [seeker, seeker], // where are bags equipt
            equipSlots, // which equipment slots
            itemSlots, // item slots
            999 // way too much
        );
        vm.stopPrank();
    }

    function _testTransferItemFailBetweenEquipees(
        address sender,
        bytes24 seeker,
        bytes24 fromEquipee,
        bytes24 toEquipee,
        bytes4 expectedError
    ) private {
        // equip two bags to seeker
        bytes24 fromBag = _spawnBagWithWood(1, aliceAccount, fromEquipee, EQUIP_SLOT_0);
        bytes24 toBag = _spawnBagEmpty(2, aliceAccount, toEquipee, EQUIP_SLOT_1);
        // confirm bag1 has 100 wood
        (bytes24 fromResourceBefore, uint64 fromBalanceBefore) = state.getItemSlot(fromBag, ITEM_SLOT_0);
        (bytes24 toResourceBefore, uint64 toBalanceBefore) = state.getItemSlot(toBag, ITEM_SLOT_0);
        assertEq(
            fromResourceBefore,
            Node.Resource(ResourceKind.WOOD),
            "expected seeker1-equip0-bag-item0 (from) resource to be wood before xfer"
        );
        assertEq(toResourceBefore, 0x0, "expected seeker1-equip1-bag-item0 (to) resource to be unset before xfer");
        assertEq(fromBalanceBefore, 100, "expected seeker1-equip1-bag-item0 balance to be 100 before xfer");
        assertEq(toBalanceBefore, 0, "expected seeker1-equip1-bag-item0 balance to be 0 before xfer");

        uint8[2] memory equipSlots = [EQUIP_SLOT_0, EQUIP_SLOT_1];
        uint8[2] memory itemSlots = [ITEM_SLOT_0, ITEM_SLOT_0];

        // perform xfer as alice
        vm.startPrank(sender);
        vm.expectRevert(expectedError);
        _transferItem(
            seeker,
            [fromEquipee, toEquipee], // where are bags equipt
            equipSlots, // which equipment slots
            itemSlots, // item slots
            50 // amount to xfer
        );
        vm.stopPrank();
    }

    function _testTransferItemBetweenEquipees(bytes24 seeker, bytes24 fromEquipee, bytes24 toEquipee) private {
        // equip two bags to seeker
        bytes24 fromBag = _spawnBagWithWood(1, aliceAccount, fromEquipee, EQUIP_SLOT_0);
        bytes24 toBag = _spawnBagEmpty(2, aliceAccount, toEquipee, EQUIP_SLOT_1);
        // confirm bag1 has 100 wood
        (bytes24 fromResourceBefore, uint64 fromBalanceBefore) = state.getItemSlot(fromBag, ITEM_SLOT_0);
        (bytes24 toResourceBefore, uint64 toBalanceBefore) = state.getItemSlot(toBag, ITEM_SLOT_0);
        assertEq(
            fromResourceBefore,
            Node.Resource(ResourceKind.WOOD),
            "expected seeker1-equip0-bag-item0 (from) resource to be wood before xfer"
        );
        assertEq(toResourceBefore, 0x0, "expected seeker1-equip1-bag-item0 (to) resource to be unset before xfer");
        assertEq(fromBalanceBefore, 100, "expected seeker1-equip1-bag-item0 balance to be 100 before xfer");
        assertEq(toBalanceBefore, 0, "expected seeker1-equip1-bag-item0 balance to be 0 before xfer");

        uint8[2] memory equipSlots = [EQUIP_SLOT_0, EQUIP_SLOT_1];
        uint8[2] memory itemSlots = [ITEM_SLOT_0, ITEM_SLOT_0];

        // perform xfer as alice
        vm.startPrank(aliceAccount);
        _transferItem(
            seeker,
            [fromEquipee, toEquipee], // where are bags equipt
            equipSlots, // which equipment slots
            itemSlots, // item slots
            50 // amount to xfer
        );
        vm.stopPrank();

        // confirm bag2 has 50 wood after xfer
        (bytes24 fromResourceAfter, uint64 fromBalanceAfter) = state.getItemSlot(fromBag, itemSlots[0]);
        (bytes24 toResourceAfter, uint64 toBalanceAfter) = state.getItemSlot(toBag, itemSlots[1]);
        assertEq(
            fromResourceAfter,
            Node.Resource(ResourceKind.WOOD),
            "expected seeker1-equip0-bag-item0 resource to be wood after xfer"
        );
        assertEq(
            toResourceAfter,
            Node.Resource(ResourceKind.WOOD),
            "expected seeker1-equip1-bag-item0 resource to be wood after xfer"
        );
        assertEq(fromBalanceAfter, 50, "expected seeker1-equip1-bag-item0 balance to decrease to 50 after xfer");
        assertEq(toBalanceAfter, 50, "expected seeker1-equip1-bag-item0 balance to increase to 50 after xfer");
    }

    function testTransferItemBetweenEquipeeAndMissingBag() public {
        bytes24 seeker = _spawnSeeker(aliceAccount, 1, 0, 0, 0);
        bytes24 fromEquipee = seeker;
        //console2.log("from equipee", uint160(bytes20(uint160(uint256(uint192(fromEquipee)) << 32))));

        // equip two bags to seeker
        bytes24 fromBag = _spawnBagWithWood(1, aliceAccount, fromEquipee, EQUIP_SLOT_0);

        bytes24 buildingInstance = Node.Building(0, 0, 0, 0);
        bytes24 toBag = Node.Bag(uint64(uint256(keccak256(abi.encode(buildingInstance)))));
        bytes24 toEquipee = buildingInstance;
        //console2.log("to equipee", uint160(bytes20(uint160(uint256(uint192(toEquipee)) << 32))));

        // confirm bag1 has 100 wood
        (bytes24 fromResourceBefore, uint64 fromBalanceBefore) = state.getItemSlot(fromBag, ITEM_SLOT_0);
        (bytes24 toResourceBefore, uint64 toBalanceBefore) = state.getItemSlot(toBag, ITEM_SLOT_0);
        assertEq(
            fromResourceBefore,
            Node.Resource(ResourceKind.WOOD),
            "expected seeker1-equip0-bag-item0 (from) resource to be wood before xfer"
        );
        assertEq(toResourceBefore, 0x0, "expected seeker1-equip1-bag-item0 (to) resource to be unset before xfer");
        assertEq(fromBalanceBefore, 100, "expected seeker1-equip1-bag-item0 balance to be 100 before xfer");
        assertEq(toBalanceBefore, 0, "expected seeker1-equip1-bag-item0 balance to be 0 before xfer");

        uint8[2] memory equipSlots = [EQUIP_SLOT_0, EQUIP_SLOT_1];
        uint8[2] memory itemSlots = [ITEM_SLOT_0, ITEM_SLOT_0];

        // perform xfer as alice
        vm.startPrank(aliceAccount);
        _transferItemToBag(
            seeker,
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
            Node.Resource(ResourceKind.WOOD),
            "expected seeker1-equip0-bag-item0 resource to be wood after xfer"
        );
        assertEq(
            toResourceAfter,
            Node.Resource(ResourceKind.WOOD),
            "expected seeker1-equip1-bag-item0 resource to be wood after xfer"
        );
        assertEq(fromBalanceAfter, 50, "expected seeker1-equip1-bag-item0 balance to decrease to 50 after xfer");
        assertEq(toBalanceAfter, 50, "expected seeker1-equip1-bag-item0 balance to increase to 50 after xfer");
    }

    function _transferItem(
        bytes24 seeker,
        bytes24[2] memory equipees,
        uint8[2] memory equipSlots,
        uint8[2] memory itemSlots,
        uint64 qty
    ) private {
        dispatcher.dispatch(
            abi.encodeCall(Actions.TRANSFER_ITEM_SEEKER, (seeker, equipees, equipSlots, itemSlots, qty))
        );
    }

    function _transferItemToBag(
        bytes24 seeker,
        bytes24[2] memory equipees,
        uint8[2] memory equipSlots,
        uint8[2] memory itemSlots,
        bytes24 bag,
        uint64 qty
    ) private {
        dispatcher.dispatch(
            abi.encodeCall(Actions.TRANSFER_ITEM_BAG, (seeker, equipees, equipSlots, itemSlots, bag, qty))
        );
    }

    function _spawnBagWithWood(uint64 bagID, address owner, bytes24 equipNode, uint8 equipSlot)
        private
        returns (bytes24)
    {
        bytes24[] memory items = new bytes24[](1);
        items[0] = Node.Resource(ResourceKind.WOOD);
        uint64[] memory balances = new uint64[](1);
        balances[0] = 100;
        return _spawnBag(bagID, owner, equipNode, equipSlot, items, balances);
    }

    function _spawnBagWithStone(uint64 bagID, address owner, bytes24 equipNode, uint8 equipSlot)
        private
        returns (bytes24)
    {
        bytes24[] memory items = new bytes24[](1);
        items[0] = Node.Resource(ResourceKind.STONE);
        uint64[] memory balances = new uint64[](1);
        balances[0] = 100;
        return _spawnBag(bagID, owner, equipNode, equipSlot, items, balances);
    }

    function _spawnBagEmpty(uint64 bagID, address owner, bytes24 equipNode, uint8 equipSlot)
        private
        returns (bytes24)
    {
        bytes24[] memory items = new bytes24[](0);
        uint64[] memory balances = new uint64[](0);
        return _spawnBag(bagID, owner, equipNode, equipSlot, items, balances);
    }

    function _spawnBag(
        uint64 bagID,
        address owner,
        bytes24 equipNode,
        uint8 equipSlot,
        bytes24[] memory resources,
        uint64[] memory qty
    ) private returns (bytes24) {
        dispatcher.dispatch(abi.encodeCall(Actions.DEV_SPAWN_BAG, (bagID, owner, equipNode, equipSlot, resources, qty)));
        return Node.Bag(bagID);
    }

    function _spawnSeeker(address owner, uint32 sid, int16 q, int16 r, int16 s) private returns (bytes24) {
        _discover(q, r, s); // discover the tile we place seeker on
        dispatcher.dispatch(
            abi.encodeCall(
                Actions.DEV_SPAWN_SEEKER,
                (
                    owner, // owner
                    sid, // seeker id (sid)
                    q, // q
                    r, // r
                    s // s
                )
            )
        );
        return Node.Seeker(sid);
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
}

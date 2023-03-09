// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";

import {State} from "cog/State.sol";
import {Dispatcher} from "cog/Dispatcher.sol";

import {Game} from "@ds/Game.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {Schema, Node, Rel, LocationKey, BiomeKind, ResourceKind, AtomKind} from "@ds/schema/Schema.sol";

using Schema for State;

uint32 constant TEST_SEEKER_ID = 1;

uint8 constant EQUIP_SLOT_0 = 0;
uint8 constant EQUIP_SLOT_1 = 1;

uint8 constant ITEM_SLOT_0 = 0;
uint8 constant ITEM_SLOT_1 = 1;

uint8 constant ITEM_QTY = 2;
uint8 constant MAX_CRAFT_INPUT_ITEMS = 4;

uint64 constant ITEM_1_WOOD_QTY = 8;
uint64 constant ITEM_1_STONE_QTY = 12;
uint64 constant ITEM_2_WOOD_QTY = 4;
uint64 constant ITEM_2_IRON_QTY = 10;

string constant ITEM_NAME = "Fancy Item";

contract CraftingRuleTest is Test {
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

    function testResources() public {
        assertEq(state.getAtoms(Node.Resource(ResourceKind.WOOD))[uint8(AtomKind.LIFE)], 2);
        assertEq(state.getAtoms(Node.Resource(ResourceKind.STONE))[uint8(AtomKind.DEF)], 2);
        assertEq(state.getAtoms(Node.Resource(ResourceKind.IRON))[uint8(AtomKind.ATK)], 2);
    }

    function testRegisteringItem() public {
        bytes24[MAX_CRAFT_INPUT_ITEMS] memory inputItems;
        uint64[MAX_CRAFT_INPUT_ITEMS] memory inputQty;
        inputItems[0] = Node.Resource(ResourceKind.WOOD);
        inputQty[0] = ITEM_1_WOOD_QTY;
        inputItems[1] = Node.Resource(ResourceKind.STONE);
        inputQty[1] = ITEM_1_STONE_QTY;

        bool stackable = true;
        dispatcher.dispatch(abi.encodeCall(Actions.REGISTER_ITEM, (inputItems, inputQty, stackable, ITEM_NAME)));

        // Get atom count for new item
        bytes24 itemID = Node.Item(inputItems, inputQty, stackable, ITEM_NAME);
        uint64[] memory numAtoms = state.getAtoms(itemID);
        assertEq(
            numAtoms[uint8(AtomKind.LIFE)],
            (2 * inputQty[0]) / 2,
            "Expected LIFE atoms to equal half the total LIFE atoms used in item recipe"
        );
        assertEq(
            numAtoms[uint8(AtomKind.DEF)],
            (2 * inputQty[1]) / 2,
            "Expected DEF atoms to equal half the total DEF atoms used in item recipe"
        );
    }

    function testCraftingStackableItem() public {
        // -- Register item
        bytes24[MAX_CRAFT_INPUT_ITEMS] memory inputItems;
        uint64[MAX_CRAFT_INPUT_ITEMS] memory inputQty;
        inputItems[0] = Node.Resource(ResourceKind.WOOD);
        inputQty[0] = ITEM_1_WOOD_QTY;
        inputItems[1] = Node.Resource(ResourceKind.STONE);
        inputQty[1] = ITEM_1_STONE_QTY;

        bool isStackable = true;
        dispatcher.dispatch(abi.encodeCall(Actions.REGISTER_ITEM, (inputItems, inputQty, isStackable, ITEM_NAME)));

        // -- Spawn player and bag with resources
        bytes24 seekerAlice = _spawnSeeker(aliceAccount, 1, 0, 0, 0);
        bytes24 destBag = _spawnBagEmpty(1, aliceAccount, seekerAlice, EQUIP_SLOT_0);
        bytes24 paymentBag = _spawnBagWithResources(
            2, // bagID
            aliceAccount,
            seekerAlice,
            EQUIP_SLOT_1,
            [ITEM_1_WOOD_QTY * ITEM_QTY, ITEM_1_STONE_QTY * ITEM_QTY, 0]
        );

        bytes24 craftItemID = Node.Item(inputItems, inputQty, isStackable, ITEM_NAME);

        // -- Craft Item
        dispatcher.dispatch(
            abi.encodeCall(
                Actions.CRAFT_STACKABLE,
                (
                    paymentBag,
                    craftItemID,
                    ITEM_QTY, // outQty
                    destBag,
                    0 // item slot
                )
            )
        );

        // -- Payment should be taken

        for (uint8 i = 0; i < MAX_CRAFT_INPUT_ITEMS; i++) {
            ( /*bytes24 itemID*/ , uint64 bal) = state.get(Rel.Balance.selector, i, paymentBag);
            assertEq(bal, 0, "Expected payment to be taken from the payment bag");
        }

        // -- Item should be in the destination bag
        {
            (bytes24 itemID, uint64 bal) = state.get(Rel.Balance.selector, 0, destBag);
            assertEq(itemID, craftItemID, "Expected crafted item to be in slot 0");
            assertEq(bal, ITEM_QTY, "Expected the number of items in slot to match the requested crafted quantity");
        }

        // -- Craft more of the same item to test that balance increments

        _spawnBagWithResources(
            2, // bagID
            aliceAccount,
            seekerAlice,
            EQUIP_SLOT_1,
            [ITEM_1_WOOD_QTY * ITEM_QTY, ITEM_1_STONE_QTY * ITEM_QTY, 0]
        );

        dispatcher.dispatch(
            abi.encodeCall(
                Actions.CRAFT_STACKABLE,
                (
                    paymentBag,
                    craftItemID,
                    ITEM_QTY, // outQty
                    destBag,
                    0 // item slot
                )
            )
        );

        {
            (bytes24 itemID, uint64 bal) = state.get(Rel.Balance.selector, 0, destBag);
            assertEq(itemID, craftItemID, "On second craft, expected crafted item to be in slot 0");
            assertEq(
                bal, ITEM_QTY * 2, "On second craft, expected the number of items in slot to equal 2x the craft quanity"
            );
        }
    }

    function testCraftingEquipableItem() public {
        // -- Register item
        bytes24[4] memory inputItems;
        uint64[4] memory inputQty;
        inputItems[0] = Node.Resource(ResourceKind.WOOD);
        inputQty[0] = ITEM_2_WOOD_QTY;
        inputItems[1] = Node.Resource(ResourceKind.IRON);
        inputQty[1] = ITEM_2_IRON_QTY;

        bool isStackable = false;
        dispatcher.dispatch(abi.encodeCall(Actions.REGISTER_ITEM, (inputItems, inputQty, isStackable, ITEM_NAME)));

        bytes24 seekerAlice = _spawnSeeker(aliceAccount, 1, 0, 0, 0);
        bytes24 destBag = _spawnBagEmpty(1, aliceAccount, seekerAlice, EQUIP_SLOT_0);
        bytes24 paymentBag = _spawnBagWithResources(
            2, // bagID
            aliceAccount,
            seekerAlice,
            EQUIP_SLOT_1,
            [ITEM_2_WOOD_QTY, 0, ITEM_2_IRON_QTY]
        );

        bytes24 craftItemID = Node.Item(inputItems, inputQty, isStackable, ITEM_NAME);

        // -- Craft Item
        dispatcher.dispatch(
            abi.encodeCall(
                Actions.CRAFT_EQUIPABLE,
                (
                    paymentBag,
                    craftItemID,
                    destBag,
                    0 // item slot
                )
            )
        );

        // -- Payment should be taken

        for (uint8 i = 0; i < MAX_CRAFT_INPUT_ITEMS; i++) {
            ( /*bytes24 itemID*/ , uint64 bal) = state.get(Rel.Balance.selector, i, paymentBag);
            assertEq(bal, 0, "Expected payment to be taken from the payment bag");
        }

        // -- Item should be in the destination bag
        {
            (bytes24 itemID, uint64 bal) = state.get(Rel.Balance.selector, 0, destBag);
            assertEq(itemID, craftItemID, "Expected crafted item to be in slot 0");
            assertEq(bal, 1, "Expected the number of items in slot to match the requested crafted quantity");
        }
    }

    function testCraftingToSlotOfDifferentItemKindWithZeroBal() public {
        // -- Register item
        bytes24[4] memory inputItems;
        uint64[4] memory inputQty;
        inputItems[0] = Node.Resource(ResourceKind.WOOD);
        inputQty[0] = ITEM_2_WOOD_QTY;
        inputItems[1] = Node.Resource(ResourceKind.IRON);
        inputQty[1] = ITEM_2_IRON_QTY;

        bool isStackable = false;
        dispatcher.dispatch(abi.encodeCall(Actions.REGISTER_ITEM, (inputItems, inputQty, isStackable, ITEM_NAME)));

        bytes24 seekerAlice = _spawnSeeker(aliceAccount, 1, 0, 0, 0);
        bytes24 destBag = _spawnBagWithResources(
            1, // bagID
            aliceAccount,
            seekerAlice,
            EQUIP_SLOT_0,
            [ITEM_2_WOOD_QTY - 1, 0, 0]
        );
        bytes24 paymentBag = _spawnBagWithResources(
            2, // bagID
            aliceAccount,
            seekerAlice,
            EQUIP_SLOT_1,
            [1, 0, ITEM_2_IRON_QTY] // Need at least 1 wood so slot 0 is reserved for wood
        );

        // -- By transferring the wood from bag 1 to 2 slot 0 on bag 1 will be of type 'wood' with a balance of zero
        vm.startPrank(aliceAccount);
        _transferItem(
            seekerAlice,
            [seekerAlice, seekerAlice], // where are bags equipt
            [EQUIP_SLOT_0, EQUIP_SLOT_1], // which equipment slots
            [0, 0], // item slots
            ITEM_2_WOOD_QTY - 1
        );
        vm.stopPrank();

        bytes24 craftItemID = Node.Item(inputItems, inputQty, isStackable, ITEM_NAME);

        // -- Craft Item
        dispatcher.dispatch(
            abi.encodeCall(
                Actions.CRAFT_EQUIPABLE,
                (
                    paymentBag,
                    craftItemID,
                    destBag,
                    0 // item slot
                )
            )
        );
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

    function _spawnBagEmpty(uint64 bagID, address owner, bytes24 equipNode, uint8 equipSlot)
        private
        returns (bytes24)
    {
        bytes24[] memory items = new bytes24[](0);
        uint64[] memory balances = new uint64[](0);
        return _spawnBag(bagID, owner, equipNode, equipSlot, items, balances);
    }

    function _spawnBagWithResources(
        uint64 bagID,
        address owner,
        bytes24 equipNode,
        uint8 equipSlot,
        uint64[3] memory resourceQty
    ) private returns (bytes24) {
        bytes24[] memory items = new bytes24[](3);
        uint64[] memory balances = new uint64[](3);

        uint8 slotId = 0;
        for (uint8 i = 0; i < 3; i++) {
            if (resourceQty[i] > 0) {
                items[slotId] = Node.Resource(ResourceKind(i + 1));
                balances[slotId] = resourceQty[i];
                slotId++;
            }
        }

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
}

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";

import {State} from "cog/State.sol";
import {Dispatcher} from "cog/Dispatcher.sol";

import {Game} from "@ds/Game.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {
    Schema,
    Node,
    Rel,
    LocationKey,
    BiomeKind,
    GOO_GREEN,
    GOO_BLUE,
    GOO_RED,
    DEFAULT_ZONE
} from "@ds/schema/Schema.sol";
import {ItemUtils} from "@ds/utils/ItemUtils.sol";
import {BuildingKind} from "@ds/ext/BuildingKind.sol";

using Schema for State;

uint8 constant MAX_CRAFT_INPUT_ITEMS = 4;

bool constant ITEM_STACKABLE = true;
bool constant ITEM_EQUIPABLE = false;

contract MockCraftBuildingContract {
    function use(Game, /*ds*/ bytes24, /*buildingInstance*/ bytes24, /*mobileUnit*/ bytes memory /*payload*/ ) public {}
}

contract CraftingRuleTest is Test {
    Game internal game;
    Dispatcher internal dispatcher;
    State internal state;

    uint64 sid;

    // accounts
    address aliceAccount;
    bytes24 aliceMobileUnit;

    // mock building implementation
    bytes24 mockBuildingKind;
    bytes24 mockBuildingInstance;
    MockCraftBuildingContract mockBuildingContract;

    function setUp() public {
        // setup players
        uint256 alicePrivateKey = 0xA11CE;
        aliceAccount = vm.addr(alicePrivateKey);

        // setup allowlist
        address[] memory allowlist = new address[](1);
        allowlist[0] = aliceAccount;

        // setup game
        game = new Game(allowlist);
        dispatcher = game.getDispatcher();

        // fetch the State to play with
        state = game.getState();

        // mobileUnits
        vm.startPrank(aliceAccount);
        aliceMobileUnit = _spawnMobileUnitWithResources();

        // setup a mock building instance owned by alice
        mockBuildingContract = new MockCraftBuildingContract();
        mockBuildingKind = _registerBuildingKind(1001, address(mockBuildingContract));
        mockBuildingInstance = _constructBuildingInstance(mockBuildingKind, aliceMobileUnit, -1, 1, 0);

        // stop being alice
        vm.stopPrank();
    }

    function testResources() public {
        assertEq(state.getAtoms(ItemUtils.GlassGreenGoo())[GOO_GREEN], 2);
        assertEq(state.getAtoms(ItemUtils.BeakerBlueGoo())[GOO_BLUE], 2);
        assertEq(state.getAtoms(ItemUtils.FlaskRedGoo())[GOO_RED], 2);
    }

    function testGetAtoms() public {
        uint32[3] memory thingAtoms = [uint32(2), uint32(4), uint32(6)];
        bytes24 thingItem = Node.Item("thing", thingAtoms, ITEM_STACKABLE);
        dispatcher.dispatch(abi.encodeCall(Actions.REGISTER_ITEM_KIND, (thingItem, "thing", "icon")));
        uint32[3] memory gotAtoms = state.getAtoms(thingItem);

        assertEq(gotAtoms[0], thingAtoms[0], "expected getAtoms()[0] to return same atoms we put in");
        assertEq(gotAtoms[1], thingAtoms[1], "expected getAtoms()[1] to return same atoms we put in");
        assertEq(gotAtoms[2], thingAtoms[2], "expected getAtoms()[2] to return same atoms we put in");
    }

    function testRegisteringCraftRecipe() public {
        vm.startPrank(aliceAccount);

        bytes24[MAX_CRAFT_INPUT_ITEMS] memory inputItem;
        inputItem[0] = ItemUtils.GlassGreenGoo();
        inputItem[1] = ItemUtils.BeakerBlueGoo();
        inputItem[2] = ItemUtils.FlaskRedGoo();

        uint64[MAX_CRAFT_INPUT_ITEMS] memory inputQty;
        inputQty[0] = 2;
        inputQty[1] = 2;
        inputQty[2] = 2;

        uint32[3] memory outputItemAtoms = [uint32(1), uint32(1), uint32(1)];
        bytes24 outputItem = Node.Item("thing", outputItemAtoms, ITEM_STACKABLE);
        uint64 outputQty = 1;

        dispatcher.dispatch(abi.encodeCall(Actions.REGISTER_ITEM_KIND, (outputItem, "thing", "icon")));
        dispatcher.dispatch(
            abi.encodeCall(
                Actions.REGISTER_CRAFT_RECIPE, (mockBuildingKind, inputItem, inputQty, outputItem, outputQty)
            )
        );
        vm.stopPrank();

        bytes24 registeredItem;
        uint64 registeredQty;

        (registeredItem, registeredQty) = state.getInput(mockBuildingKind, 0);
        assertEq(registeredItem, inputItem[0]);
        assertEq(registeredQty, inputQty[0]);

        (registeredItem, registeredQty) = state.getInput(mockBuildingKind, 1);
        assertEq(registeredItem, inputItem[1]);
        assertEq(registeredQty, inputQty[1]);

        (registeredItem, registeredQty) = state.getInput(mockBuildingKind, 2);
        assertEq(registeredItem, inputItem[2]);
        assertEq(registeredQty, inputQty[2]);
    }

    function testCrafting() public {
        // alice puts the input items into the building's bag
        vm.startPrank(aliceAccount);
        _transferItem(
            aliceMobileUnit,
            [aliceMobileUnit, mockBuildingInstance],
            [0, 0], // from/to equip
            [0, 0], // from/to slot
            0x0, // unused
            4 // move 4 but only need 2
        );
        _transferItem(
            aliceMobileUnit,
            [aliceMobileUnit, mockBuildingInstance],
            [0, 0],
            [1, 1],
            0x0, // unused
            4 // move 4 but only need 2
        );
        _transferItem(
            aliceMobileUnit,
            [aliceMobileUnit, mockBuildingInstance],
            [0, 0],
            [2, 2],
            0x0, //unused
            4 // move 4 but only need 2
        );
        vm.stopPrank();

        // craft
        vm.startPrank(address(mockBuildingContract));
        dispatcher.dispatch(abi.encodeCall(Actions.CRAFT, (mockBuildingInstance)));
        vm.stopPrank();

        // check that output item now exists in outputBag slot 0
        bytes24 inputBag = state.getEquipSlot(mockBuildingInstance, 0);
        bytes24 outputBag = state.getEquipSlot(mockBuildingInstance, 1);
        (bytes24 expItem, uint64 expBalance) = state.getOutput(mockBuildingKind, 0);
        (bytes24 gotItem, uint64 gotBalance) = state.getItemSlot(outputBag, 0);
        assertEq(gotItem, expItem, "expected output slot to contain expected output item");
        assertEq(gotBalance, expBalance, "expected output balance match");

        // check the input slots are empty
        (, gotBalance) = state.getItemSlot(inputBag, 0);
        assertEq(gotBalance, 2, "expected 2 item left in input[0]");
        (, gotBalance) = state.getItemSlot(inputBag, 1);
        assertEq(gotBalance, 2, "expected 2 item left in input[1]");
        (, gotBalance) = state.getItemSlot(inputBag, 2);
        assertEq(gotBalance, 2, "expected 2 item left in input[2]");
    }

    function testBadSender() public {
        // alice puts the input items into the building's bag
        vm.startPrank(aliceAccount);
        _transferItem(
            aliceMobileUnit,
            [aliceMobileUnit, mockBuildingInstance],
            [0, 0], // from/to equip
            [0, 0], // from/to slot
            0x0, // unused
            4 // move 4 but only need 2
        );
        _transferItem(
            aliceMobileUnit,
            [aliceMobileUnit, mockBuildingInstance],
            [0, 0],
            [1, 1],
            0x0, // unused
            4 // move 4 but only need 2
        );
        _transferItem(
            aliceMobileUnit,
            [aliceMobileUnit, mockBuildingInstance],
            [0, 0],
            [2, 2],
            0x0, //unused
            4 // move 4 but only need 2
        );
        vm.stopPrank();

        // craft and check output
        vm.startPrank(vm.addr(0xBADD1E));
        vm.expectRevert("sender must be BuildingKind implementation");
        dispatcher.dispatch(abi.encodeCall(Actions.CRAFT, (mockBuildingInstance)));
        vm.stopPrank();

        // should not be any items
        bytes24 outputBag = state.getEquipSlot(mockBuildingInstance, 1);
        (, uint64 gotBalance) = state.getItemSlot(outputBag, 0);
        assertEq(gotBalance, 0);
    }

    function testNotEnoughInputs() public {
        // alice puts the input items into the building's bag
        vm.startPrank(aliceAccount);
        _transferItem(
            aliceMobileUnit,
            [aliceMobileUnit, mockBuildingInstance],
            [0, 0], // from/to equip
            [0, 0], // from/to slot
            0x0, // unused
            1 // too few
        );
        _transferItem(
            aliceMobileUnit,
            [aliceMobileUnit, mockBuildingInstance],
            [0, 0],
            [1, 1],
            0x0, // unused
            1 // too few
        );
        _transferItem(
            aliceMobileUnit,
            [aliceMobileUnit, mockBuildingInstance],
            [0, 0],
            [2, 2],
            0x0,
            1 // too few
        );
        vm.stopPrank();

        // craft
        vm.startPrank(address(mockBuildingContract));
        vm.expectRevert("input 0 qty does not match recipe");
        dispatcher.dispatch(abi.encodeCall(Actions.CRAFT, (mockBuildingInstance)));
        vm.stopPrank();

        // should be no output
        bytes24 outputBag = state.getEquipSlot(mockBuildingInstance, 1);
        (, uint64 gotBalance) = state.getItemSlot(outputBag, 0);
        assertEq(gotBalance, 0);
    }

    // _spawnMobileUnitWithResources spawns a mobileUnit for the current sender at
    // 0,0,0 with 100 of each resource in an equiped bag
    function _spawnMobileUnitWithResources() private returns (bytes24) {
        sid++;
        bytes24 mobileUnit = Node.MobileUnit(sid);
        _discover(0, 0, 0);
        dispatcher.dispatch(abi.encodeCall(Actions.SPAWN_MOBILE_UNIT, (mobileUnit)));
        bytes24[] memory items = new bytes24[](3);
        items[0] = ItemUtils.GlassGreenGoo();
        items[1] = ItemUtils.BeakerBlueGoo();
        items[2] = ItemUtils.FlaskRedGoo();

        uint64[] memory balances = new uint64[](3);
        balances[0] = 100;
        balances[1] = 100;
        balances[2] = 100;

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

    function _registerBuildingKind(uint64 uid, address buildingContract) private returns (bytes24) {
        bytes24[4] memory defaultMaterialItem;
        defaultMaterialItem[0] = ItemUtils.GlassGreenGoo();
        defaultMaterialItem[1] = ItemUtils.BeakerBlueGoo();
        defaultMaterialItem[2] = ItemUtils.FlaskRedGoo();
        uint64[4] memory defaultMaterialQty;
        defaultMaterialQty[0] = 25;
        defaultMaterialQty[1] = 25;
        defaultMaterialQty[2] = 25;
        bytes24 buildingKind = Node.BuildingKind(uid);
        dispatcher.dispatch(
            abi.encodeCall(
                Actions.REGISTER_BUILDING_KIND, (buildingKind, "TestBuilding", defaultMaterialItem, defaultMaterialQty)
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
        bytes24[MAX_CRAFT_INPUT_ITEMS] memory inputItem;
        inputItem[0] = ItemUtils.GlassGreenGoo();
        inputItem[1] = ItemUtils.BeakerBlueGoo();
        inputItem[2] = ItemUtils.FlaskRedGoo();

        uint64[MAX_CRAFT_INPUT_ITEMS] memory inputQty;
        inputQty[0] = 2;
        inputQty[1] = 2;
        inputQty[2] = 2;

        uint32[3] memory outputItemAtoms = [uint32(1), uint32(1), uint32(1)];
        bytes24 outputItem = Node.Item("thing", outputItemAtoms, ITEM_STACKABLE);
        uint64 outputQty = 1;

        dispatcher.dispatch(abi.encodeCall(Actions.REGISTER_ITEM_KIND, (outputItem, "thing", "icon")));
        dispatcher.dispatch(
            abi.encodeCall(Actions.REGISTER_CRAFT_RECIPE, (buildingKind, inputItem, inputQty, outputItem, outputQty))
        );

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

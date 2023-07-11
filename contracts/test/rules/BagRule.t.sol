// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";

import {Game} from "cog/Game.sol";
import {State, AnnotationKind} from "cog/State.sol";
import {Dispatcher} from "cog/Dispatcher.sol";

import {Game as Downstream} from "@ds/Game.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {Schema, Node, Rel, LocationKey, Kind, BiomeKind, DEFAULT_ZONE} from "@ds/schema/Schema.sol";
import {ItemUtils} from "@ds/utils/ItemUtils.sol";
import {BuildingKind} from "@ds/ext/BuildingKind.sol";

using Schema for State;

contract BuildingRuleTest is Test {
    event AnnotationSet(bytes24 id, AnnotationKind kind, string label, bytes32 ref, string data);

    Game internal game;
    Dispatcher internal dispatcher;
    State internal state;

    // accounts
    address aliceAccount;
    address bobAccount;
    uint64 sid;

    bytes24[4] defaultMaterialItem;
    uint64[4] defaultMaterialQty;

    bytes24 _buildingInstance;
    MockBuildingKind _buildingImplementation;

    bytes24 _mobileUnitAlice;
    bytes24 _mobileUnitBob;

    function setUp() public {
        // setup users
        uint256 alicePrivateKey = 0xA11CE;
        aliceAccount = vm.addr(alicePrivateKey);
        uint256 bobPrivateKey = 0xB0b;
        bobAccount = vm.addr(bobPrivateKey);

        // setup allowlist
        address[] memory allowlist = new address[](2);
        allowlist[0] = aliceAccount;
        allowlist[1] = bobAccount;

        // setup game
        game = new Downstream(allowlist);
        dispatcher = game.getDispatcher();

        // fetch the State to play with
        state = game.getState();

        // setup default material construction costs
        defaultMaterialItem[0] = ItemUtils.GlassGreenGoo();
        defaultMaterialItem[1] = ItemUtils.BeakerBlueGoo();
        defaultMaterialItem[2] = ItemUtils.FlaskRedGoo();
        defaultMaterialQty[0] = 25;
        defaultMaterialQty[1] = 25;
        defaultMaterialQty[2] = 25;

        vm.startPrank(aliceAccount);
        _mobileUnitAlice = _spawnMobileUnitWithResources();
        vm.stopPrank();

        vm.startPrank(bobAccount);
        _mobileUnitBob = _spawnMobileUnitWithResources();
        vm.stopPrank();

        _buildingInstance = _constructBuilding(bobAccount, _mobileUnitBob);
    }

    function testTransferToAndFromMobileUnits() public {
        bytes24 bag = state.getEquipSlot(_mobileUnitAlice, 0);
        assertEq(bytes4(bag), Kind.Bag.selector, "Entity at equip slot 0 isn't a bag");

        // -- Transfer from Alice to Bob
        vm.startPrank(aliceAccount);
        dispatcher.dispatch(abi.encodeCall(Actions.TRANSFER_BAG, (bag, _mobileUnitAlice, _mobileUnitBob)));
        dispatcher.dispatch(abi.encodeCall(Actions.TRANSFER_BAG_OWNERSHIP, (bag, _mobileUnitBob)));
        vm.stopPrank();

        assertEq(state.getEquipSlot(_mobileUnitAlice, 0), bytes24(0), "Expected bag not to be equipped to Alice");
        assertEq(state.getOwner(bag), Node.Player(bobAccount), "Expected the bag to be owned by bobAccount");

        // Mobile units are spawned with two bags at slots 0 and 1. Expecting the transferred bag to be at the next available slot
        assertEq(state.getEquipSlot(_mobileUnitBob, 2), bag, "Expected bag to be equipped to Bob at slot 2");

        // -- Transfer back to Alice

        vm.startPrank(bobAccount);
        dispatcher.dispatch(abi.encodeCall(Actions.TRANSFER_BAG, (bag, _mobileUnitBob, _mobileUnitAlice)));
        dispatcher.dispatch(abi.encodeCall(Actions.TRANSFER_BAG_OWNERSHIP, (bag, _mobileUnitAlice)));
        vm.stopPrank();

        assertEq(state.getEquipSlot(_mobileUnitBob, 2), bytes24(0), "Expected bag not to be equipped to Bob");
        assertEq(state.getOwner(bag), Node.Player(aliceAccount), "Expected the bag to be owned by aliceAccount");

        // Bag should end up back at slot 0 for Alice as it was empty
        assertEq(state.getEquipSlot(_mobileUnitAlice, 0), bag, "Expected bag to be equipped to Alice at slot 0");
    }

    function testTransferToAndFromBuilding() public {
        bytes24 bag = state.getEquipSlot(_mobileUnitAlice, 0);
        assertEq(bytes4(bag), Kind.Bag.selector, "Entity at equip slot 0 isn't a bag");

        // -- Transfer from Alice to building

        vm.startPrank(aliceAccount);
        dispatcher.dispatch(abi.encodeCall(Actions.TRANSFER_BAG, (bag, _mobileUnitAlice, _buildingInstance)));
        dispatcher.dispatch(abi.encodeCall(Actions.TRANSFER_BAG_OWNERSHIP, (bag, _buildingInstance)));
        vm.stopPrank();

        assertEq(state.getEquipSlot(_mobileUnitAlice, 0), bytes24(0), "Expected bag not to be equipped to Alice");
        assertEq(state.getOwner(bag), _buildingInstance, "Expected the bag to be owned by _buildingInstance");

        // -- Transfer from building back to Alice

        // Buildings are constructed with two bags at slots 0 and 1. Expecting the transferred bag to be at the next available slot
        assertEq(state.getEquipSlot(_buildingInstance, 2), bag, "Expected bag to be equipped to Bob at slot 2");

        vm.startPrank(address(_buildingImplementation));
        dispatcher.dispatch(abi.encodeCall(Actions.TRANSFER_BAG, (bag, _buildingInstance, _mobileUnitAlice)));
        dispatcher.dispatch(abi.encodeCall(Actions.TRANSFER_BAG_OWNERSHIP, (bag, _mobileUnitAlice)));
        vm.stopPrank();

        assertEq(state.getEquipSlot(_buildingInstance, 2), bytes24(0), "Expected bag not to be equipped to building");
        assertEq(state.getOwner(bag), Node.Player(aliceAccount), "Expected the bag to be owned by aliceAccount");

        // Bag should end up back at slot 0 for Alice as it was empty
        assertEq(state.getEquipSlot(_mobileUnitAlice, 0), bag, "Expected bag to be equipped to Alice at slot 0");
    }

    function testUnitEquipeeAllowedToTransfer() public {
        bytes24 bag = state.getEquipSlot(_mobileUnitAlice, 0);
        assertEq(bytes4(bag), Kind.Bag.selector, "Entity at equip slot 0 isn't a bag");

        // -- Transfer from Alice to Bob (NOT INCLUDING OWNERSHIP)
        vm.startPrank(aliceAccount);
        dispatcher.dispatch(abi.encodeCall(Actions.TRANSFER_BAG, (bag, _mobileUnitAlice, _mobileUnitBob)));
        vm.stopPrank();

        assertEq(state.getEquipSlot(_mobileUnitAlice, 0), bytes24(0), "Expected bag not to be equipped to Alice");
        assertEq(state.getOwner(bag), Node.Player(aliceAccount), "Expected the bag to be owned by alice");

        // -- Transfer back to Alice

        vm.startPrank(bobAccount);
        vm.expectRevert();
        dispatcher.dispatch(abi.encodeCall(Actions.TRANSFER_BAG_OWNERSHIP, (bag, _mobileUnitBob)));
        dispatcher.dispatch(abi.encodeCall(Actions.TRANSFER_BAG, (bag, _mobileUnitBob, _mobileUnitAlice)));
        vm.stopPrank();

        assertEq(state.getEquipSlot(_mobileUnitBob, 2), bytes24(0), "Expected bag not to be equipped to Bob");
        assertEq(state.getOwner(bag), Node.Player(aliceAccount), "Expected the bag to be owned by aliceAccount");
        assertEq(state.getEquipSlot(_mobileUnitAlice, 0), bag, "Expected bag to be equipped to Alice at slot 0");
    }

    function testBuildingEquipeeAllowedToTransfer() public {
        bytes24 bag = state.getEquipSlot(_mobileUnitAlice, 0);
        assertEq(bytes4(bag), Kind.Bag.selector, "Entity at equip slot 0 isn't a bag");

        // -- Transfer from Alice to building (NOT INCLUDING OWNERSHIP)
        vm.startPrank(aliceAccount);
        dispatcher.dispatch(abi.encodeCall(Actions.TRANSFER_BAG, (bag, _mobileUnitAlice, _buildingInstance)));
        vm.stopPrank();

        assertEq(state.getEquipSlot(_mobileUnitAlice, 0), bytes24(0), "Expected bag not to be equipped to Alice");
        assertEq(state.getOwner(bag), Node.Player(aliceAccount), "Expected the bag to be owned by alice");

        // -- Transfer back to Alice

        vm.startPrank(address(_buildingImplementation));
        vm.expectRevert();
        dispatcher.dispatch(abi.encodeCall(Actions.TRANSFER_BAG_OWNERSHIP, (bag, _buildingInstance)));
        dispatcher.dispatch(abi.encodeCall(Actions.TRANSFER_BAG, (bag, _buildingInstance, _mobileUnitAlice)));
        vm.stopPrank();

        assertEq(state.getEquipSlot(_buildingInstance, 2), bytes24(0), "Expected bag not to be equipped to building");
        assertEq(state.getOwner(bag), Node.Player(aliceAccount), "Expected the bag to be owned by aliceAccount");
        assertEq(state.getEquipSlot(_mobileUnitAlice, 0), bag, "Expected bag to be equipped to Alice at slot 0");
    }

    function testSpawnEmptyBagOnUnit() public {
        bytes24 bag = state.getEquipSlot(_mobileUnitAlice, 2);
        assertEq(bag, bytes24(0), "Expected no entity to be equipped to alice at slot 2");

        vm.startPrank(aliceAccount);
        dispatcher.dispatch(abi.encodeCall(Actions.SPAWN_EMPTY_BAG, (_mobileUnitAlice)));
        vm.stopPrank();

        bag = state.getEquipSlot(_mobileUnitAlice, 2);
        assertEq(bytes4(bag), Kind.Bag.selector, "Expected alice to be equipped with new bag at slot 2");
        assertEq(state.getOwner(bag), Node.Player(aliceAccount), "Expected the bag to be owned by aliceAccount");
    }

    function testSpawnEmptyBagOnBuilding() public {
        bytes24 bag = state.getEquipSlot(_buildingInstance, 2);
        assertEq(bag, bytes24(0), "Expected no entity to be equipped to building at slot 2");

        vm.startPrank(address(_buildingImplementation));
        dispatcher.dispatch(abi.encodeCall(Actions.SPAWN_EMPTY_BAG, (_buildingInstance)));
        vm.stopPrank();

        bag = state.getEquipSlot(_buildingInstance, 2);
        assertEq(bytes4(bag), Kind.Bag.selector, "Expected building to be equipped with new bag at slot 2");
        assertEq(state.getOwner(bag), _buildingInstance, "Expected the bag to be owned by building");
    }

    function testFailSpawnEmptyBagOnNonOwnedEntity() public {
        vm.startPrank(aliceAccount);
        dispatcher.dispatch(abi.encodeCall(Actions.SPAWN_EMPTY_BAG, (_buildingInstance)));
        vm.stopPrank();
    }

    // ------------------------------------------------------------------------------------------- //

    function _constructBuilding(address builderAccount, bytes24 mobileUnit) private returns (bytes24) {
        // register a building kind
        bytes24 buildingKind = Node.BuildingKind(20);
        string memory buildingName = "hut";
        vm.expectEmit(true, true, true, true, address(state));
        emit AnnotationSet(buildingKind, AnnotationKind.CALLDATA, "name", keccak256(bytes(buildingName)), buildingName);
        dispatcher.dispatch(
            abi.encodeCall(
                Actions.REGISTER_BUILDING_KIND, (buildingKind, "hut", defaultMaterialItem, defaultMaterialQty)
            )
        );
        // register a mock implementation for the building
        _buildingImplementation = new MockBuildingKind();
        dispatcher.dispatch(
            abi.encodeCall(Actions.REGISTER_KIND_IMPLEMENTATION, (buildingKind, address(_buildingImplementation)))
        );

        // spawn a mobileUnit
        vm.startPrank(builderAccount);
        // discover an adjacent tile for our building site
        (int16 q, int16 r, int16 s) = (1, -1, 0);
        _discover(q, r, s);
        // get our building and give it the resources to construct
        bytes24 buildingInstance = Node.Building(DEFAULT_ZONE, q, r, s);
        // construct our building
        _transferFromMobileUnit(mobileUnit, 0, 25, buildingInstance);
        _transferFromMobileUnit(mobileUnit, 1, 25, buildingInstance);
        _transferFromMobileUnit(mobileUnit, 2, 25, buildingInstance);
        dispatcher.dispatch(abi.encodeCall(Actions.CONSTRUCT_BUILDING_MOBILE_UNIT, (mobileUnit, buildingKind, q, r, s)));
        vm.stopPrank();
        // check the building has a location at q/r/s
        assertEq(
            state.getFixedLocation(buildingInstance),
            Node.Tile(DEFAULT_ZONE, q, r, s),
            "expected building to have location"
        );
        // check building has owner
        assertEq(
            state.getOwner(buildingInstance),
            Node.Player(builderAccount),
            "expected building to be owned by builder acccount"
        );
        // check building has kind
        assertEq(state.getBuildingKind(buildingInstance), buildingKind, "expected building to have kind");
        // check building has a bag equip
        assertTrue(state.getEquipSlot(buildingInstance, 0) != 0x0, "expected building to have a bag equip");

        return buildingInstance;
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

    function _transferFromMobileUnit(bytes24 mobileUnit, uint8 slot, uint64 qty, bytes24 toBuilding) private {
        bytes24 buildingBag = Node.Bag(uint64(uint256(keccak256(abi.encode(toBuilding)))));
        dispatcher.dispatch(
            abi.encodeCall(
                Actions.TRANSFER_ITEM_MOBILE_UNIT,
                (mobileUnit, [mobileUnit, toBuilding], [0, 0], [slot, slot], buildingBag, qty)
            )
        );
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

contract MockBuildingKind is BuildingKind {
    struct UseArgs {
        Game game;
        bytes24 building;
        bytes24 mobileUnit;
        uint256 payloadLen;
    }

    UseArgs[] public useCalls;

    function use(Game game, bytes24 building, bytes24 mobileUnit, bytes memory payload) public {
        UseArgs storage call = useCalls.push();
        call.game = game;
        call.building = building;
        call.mobileUnit = mobileUnit;
        call.payloadLen = payload.length;
    }

    function getUseCallCount() public view returns (uint256) {
        return useCalls.length;
    }
}

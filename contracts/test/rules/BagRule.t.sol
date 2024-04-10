// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "../helpers/GameTest.sol";
import {BuildingKind} from "@ds/ext/BuildingKind.sol";

using Schema for State;

contract BagRuleTest is Test, GameTest {
    event AnnotationSet(bytes24 id, AnnotationKind kind, string label, bytes32 ref, string data);

    bytes24[4] defaultMaterialItem;
    uint64[4] defaultMaterialQty;

    bytes24 _buildingInstance;
    MockBuildingKind _buildingImplementation;

    bytes24 _mobileUnit0;
    bytes24 _mobileUnit1;

    function setUp() public {
        // spawn tiles
        dev.spawnTile(0, 0, 0, 0);
        dev.spawnTile(0, 1, -1, 0);
        // setup default material construction costs
        defaultMaterialItem[0] = ItemUtils.GreenGoo();
        defaultMaterialItem[1] = ItemUtils.BlueGoo();
        defaultMaterialItem[2] = ItemUtils.RedGoo();
        defaultMaterialQty[0] = 25;
        defaultMaterialQty[1] = 25;
        defaultMaterialQty[2] = 25;

        _mobileUnit0 = _spawnMobileUnitWithResources(players[0].addr);
        _mobileUnit1 = _spawnMobileUnitWithResources(players[1].addr);
        _buildingInstance = _constructBuilding(players[1].addr, _mobileUnit1, 0, 1, -1, 0);
    }

    function testTransferToAndFromMobileUnits() public {
        bytes24 bag = state.getEquipSlot(_mobileUnit0, 0);
        assertEq(bytes4(bag), Kind.Bag.selector, "Entity at equip slot 0 isn't a bag");

        // -- Transfer from Alice to Bob
        vm.startPrank(players[0].addr);
        dispatcher.dispatch(abi.encodeCall(Actions.TRANSFER_BAG, (bag, _mobileUnit0, _mobileUnit1, 2)));
        dispatcher.dispatch(abi.encodeCall(Actions.TRANSFER_BAG_OWNERSHIP, (bag, _mobileUnit1)));
        vm.stopPrank();

        assertEq(state.getEquipSlot(_mobileUnit0, 0), bytes24(0), "Expected bag not to be equipped to Alice");
        assertEq(state.getOwner(bag), Node.Player(players[1].addr), "Expected the bag to be owned by players[1].addr");

        // Mobile units are spawned with two bags at slots 0 and 1. Expecting the transferred bag to be at the next available slot
        assertEq(state.getEquipSlot(_mobileUnit1, 2), bag, "Expected bag to be equipped to Bob at slot 2");

        // -- Transfer back to Alice

        vm.startPrank(players[1].addr);
        dispatcher.dispatch(abi.encodeCall(Actions.TRANSFER_BAG, (bag, _mobileUnit1, _mobileUnit0, 0)));
        dispatcher.dispatch(abi.encodeCall(Actions.TRANSFER_BAG_OWNERSHIP, (bag, _mobileUnit0)));
        vm.stopPrank();

        assertEq(state.getEquipSlot(_mobileUnit1, 2), bytes24(0), "Expected bag not to be equipped to Bob");
        assertEq(state.getOwner(bag), Node.Player(players[0].addr), "Expected the bag to be owned by players[0].addr");

        // Bag should end up back at slot 0 for Alice as it was empty
        assertEq(state.getEquipSlot(_mobileUnit0, 0), bag, "Expected bag to be equipped to Alice at slot 0");
    }

    function testTransferToAndFromBuilding() public {
        bytes24 bag = state.getEquipSlot(_mobileUnit0, 0);
        assertEq(bytes4(bag), Kind.Bag.selector, "Entity at equip slot 0 isn't a bag");

        // -- Transfer from Alice to building

        vm.startPrank(players[0].addr);
        dispatcher.dispatch(abi.encodeCall(Actions.TRANSFER_BAG, (bag, _mobileUnit0, _buildingInstance, 2)));
        dispatcher.dispatch(abi.encodeCall(Actions.TRANSFER_BAG_OWNERSHIP, (bag, _buildingInstance)));
        vm.stopPrank();

        assertEq(state.getEquipSlot(_mobileUnit0, 0), bytes24(0), "Expected bag not to be equipped to Alice");
        assertEq(state.getOwner(bag), _buildingInstance, "Expected the bag to be owned by _buildingInstance");

        // -- Transfer from building back to Alice

        // Buildings are constructed with two bags at slots 0 and 1. Expecting the transferred bag to be at the next available slot
        assertEq(state.getEquipSlot(_buildingInstance, 2), bag, "Expected bag to be equipped to Bob at slot 2");

        vm.startPrank(address(_buildingImplementation));
        dispatcher.dispatch(abi.encodeCall(Actions.TRANSFER_BAG, (bag, _buildingInstance, _mobileUnit0, 0)));
        dispatcher.dispatch(abi.encodeCall(Actions.TRANSFER_BAG_OWNERSHIP, (bag, _mobileUnit0)));
        vm.stopPrank();

        assertEq(state.getEquipSlot(_buildingInstance, 2), bytes24(0), "Expected bag not to be equipped to building");
        assertEq(state.getOwner(bag), Node.Player(players[0].addr), "Expected the bag to be owned by players[0].addr");

        // Bag should end up back at slot 0 for Alice as it was empty
        assertEq(state.getEquipSlot(_mobileUnit0, 0), bag, "Expected bag to be equipped to Alice at slot 0");
    }

    function testUnitEquipeeAllowedToTransfer() public {
        bytes24 bag = state.getEquipSlot(_mobileUnit0, 0);
        assertEq(bytes4(bag), Kind.Bag.selector, "Entity at equip slot 0 isn't a bag");

        // -- Transfer from Alice to Bob (NOT INCLUDING OWNERSHIP)
        vm.startPrank(players[0].addr);
        dispatcher.dispatch(abi.encodeCall(Actions.TRANSFER_BAG, (bag, _mobileUnit0, _mobileUnit1, 2)));
        vm.stopPrank();

        assertEq(state.getEquipSlot(_mobileUnit0, 0), bytes24(0), "Expected bag not to be equipped to Alice");
        assertEq(state.getOwner(bag), Node.Player(players[0].addr), "Expected the bag to be owned by alice");

        // -- Transfer back to Alice

        vm.startPrank(players[1].addr);
        vm.expectRevert();
        dispatcher.dispatch(abi.encodeCall(Actions.TRANSFER_BAG_OWNERSHIP, (bag, _mobileUnit1)));
        dispatcher.dispatch(abi.encodeCall(Actions.TRANSFER_BAG, (bag, _mobileUnit1, _mobileUnit0, 0)));
        vm.stopPrank();

        assertEq(state.getEquipSlot(_mobileUnit1, 2), bytes24(0), "Expected bag not to be equipped to Bob");
        assertEq(state.getOwner(bag), Node.Player(players[0].addr), "Expected the bag to be owned by players[0].addr");
        assertEq(state.getEquipSlot(_mobileUnit0, 0), bag, "Expected bag to be equipped to Alice at slot 0");
    }

    function testBuildingEquipeeAllowedToTransfer() public {
        bytes24 bag = state.getEquipSlot(_mobileUnit0, 0);
        assertEq(bytes4(bag), Kind.Bag.selector, "Entity at equip slot 0 isn't a bag");

        // -- Transfer from Alice to building (NOT INCLUDING OWNERSHIP)
        vm.startPrank(players[0].addr);
        dispatcher.dispatch(abi.encodeCall(Actions.TRANSFER_BAG, (bag, _mobileUnit0, _buildingInstance, 2)));
        vm.stopPrank();

        assertEq(state.getEquipSlot(_mobileUnit0, 0), bytes24(0), "Expected bag not to be equipped to Alice");
        assertEq(state.getOwner(bag), Node.Player(players[0].addr), "Expected the bag to be owned by alice");

        // -- Transfer back to Alice

        vm.startPrank(address(_buildingImplementation));
        vm.expectRevert();
        dispatcher.dispatch(abi.encodeCall(Actions.TRANSFER_BAG_OWNERSHIP, (bag, _buildingInstance)));
        dispatcher.dispatch(abi.encodeCall(Actions.TRANSFER_BAG, (bag, _buildingInstance, _mobileUnit0, 0)));
        vm.stopPrank();

        assertEq(state.getEquipSlot(_buildingInstance, 2), bytes24(0), "Expected bag not to be equipped to building");
        assertEq(state.getOwner(bag), Node.Player(players[0].addr), "Expected the bag to be owned by players[0].addr");
        assertEq(state.getEquipSlot(_mobileUnit0, 0), bag, "Expected bag to be equipped to Alice at slot 0");
    }

    function testSpawnEmptyBagOnUnit() public {
        bytes24 bag = state.getEquipSlot(_mobileUnit0, 2);
        assertEq(bag, bytes24(0), "Expected no entity to be equipped to alice at slot 2");

        vm.startPrank(players[0].addr);
        dispatcher.dispatch(abi.encodeCall(Actions.SPAWN_EMPTY_BAG, (_mobileUnit0, 2)));
        vm.stopPrank();

        bag = state.getEquipSlot(_mobileUnit0, 2);
        assertEq(bytes4(bag), Kind.Bag.selector, "Expected alice to be equipped with new bag at slot 2");
        assertEq(state.getOwner(bag), Node.Player(players[0].addr), "Expected the bag to be owned by players[0].addr");
    }

    function testSpawnEmptyBagOnBuilding() public {
        bytes24 bag = state.getEquipSlot(_buildingInstance, 2);
        assertEq(bag, bytes24(0), "Expected no entity to be equipped to building at slot 2");

        vm.startPrank(address(_buildingImplementation));
        dispatcher.dispatch(abi.encodeCall(Actions.SPAWN_EMPTY_BAG, (_buildingInstance, 2)));
        vm.stopPrank();

        bag = state.getEquipSlot(_buildingInstance, 2);
        assertEq(bytes4(bag), Kind.Bag.selector, "Expected building to be equipped with new bag at slot 2");
        assertEq(state.getOwner(bag), _buildingInstance, "Expected the bag to be owned by building");
    }

    function testFailSpawnEmptyBagOnNonOwnedEntity() public {
        vm.startPrank(players[0].addr);
        dispatcher.dispatch(abi.encodeCall(Actions.SPAWN_EMPTY_BAG, (_buildingInstance, 2)));
        vm.stopPrank();
    }

    function testFailSpawnEmptyBagOnNonEmptySlot() public {
        vm.startPrank(players[0].addr);
        dispatcher.dispatch(abi.encodeCall(Actions.SPAWN_EMPTY_BAG, (_mobileUnit0, 0)));
        vm.stopPrank();
    }

    function testMakingABagPublic() public {
        bytes24 bag = state.getEquipSlot(_mobileUnit0, 2);
        assertEq(bag, bytes24(0), "Expected no entity to be equipped to alice at slot 2");

        vm.startPrank(players[0].addr);
        dispatcher.dispatch(abi.encodeCall(Actions.SPAWN_EMPTY_BAG, (_mobileUnit0, 2)));
        bag = state.getEquipSlot(_mobileUnit0, 2);
        dispatcher.dispatch(abi.encodeCall(Actions.TRANSFER_BAG_OWNERSHIP, (bag, bytes24(0))));
        vm.stopPrank();

        assertEq(bytes4(bag), Kind.Bag.selector, "Expected alice to be equipped with new bag at slot 2");
        assertEq(state.getOwner(bag), bytes24(0), "Expected the bag to be owned 0x0 (public)");
    }

    function testFailClaimingAPublicBag() public {
        bytes24 bag = state.getEquipSlot(_mobileUnit0, 2);
        assertEq(bag, bytes24(0), "Expected no entity to be equipped to alice at slot 2");

        vm.startPrank(players[0].addr);
        dispatcher.dispatch(abi.encodeCall(Actions.SPAWN_EMPTY_BAG, (_mobileUnit0, 2)));
        bag = state.getEquipSlot(_mobileUnit0, 2);
        dispatcher.dispatch(abi.encodeCall(Actions.TRANSFER_BAG_OWNERSHIP, (bag, bytes24(0))));
        dispatcher.dispatch(abi.encodeCall(Actions.TRANSFER_BAG_OWNERSHIP, (bag, _mobileUnit0)));
        vm.stopPrank();
    }

    // ------------------------------------------------------------------------------------------- //

    function _constructBuilding(address builderAccount, bytes24 mobileUnit, int16 z, int16 q, int16 r, int16 s)
        private
        returns (bytes24)
    {
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
        // register a mock implementation for the building
        _buildingImplementation = new MockBuildingKind();
        dispatcher.dispatch(
            abi.encodeCall(Actions.REGISTER_KIND_IMPLEMENTATION, (buildingKind, address(_buildingImplementation)))
        );

        // spawn a mobileUnit
        vm.startPrank(builderAccount);
        // get our building and give it the resources to construct
        bytes24 buildingInstance = Node.Building(z, q, r, s);
        // construct our building
        _transferFromMobileUnit(mobileUnit, 0, 25, buildingInstance);
        _transferFromMobileUnit(mobileUnit, 1, 25, buildingInstance);
        _transferFromMobileUnit(mobileUnit, 2, 25, buildingInstance);
        dispatcher.dispatch(abi.encodeCall(Actions.CONSTRUCT_BUILDING_MOBILE_UNIT, (buildingKind, z, q, r, s)));
        vm.stopPrank();
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
        assertTrue(state.getEquipSlot(buildingInstance, 0) != 0x0, "expected building to have a bag equip");

        return buildingInstance;
    }

    // _spawnMobileUnitWithResources spawns a mobileUnit for the current sender at
    // 0,0,0 with 100 of each resource in an equiped bag
    function _spawnMobileUnitWithResources(address player) private returns (bytes24) {
        vm.startPrank(player);
        dev.spawnTile(0, 0, 0, 0);
        spawnMobileUnit();
        bytes24 mobileUnit = Node.MobileUnit(player);
        dev.spawnFullBag(state.getOwnerAddress(mobileUnit), mobileUnit, 0);
        vm.stopPrank();

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
}

contract MockBuildingKind is BuildingKind {
    struct UseArgs {
        Game game;
        bytes24 building;
        bytes24 mobileUnit;
        uint256 payloadLen;
    }

    UseArgs[] public useCalls;

    function use(Game game, bytes24 building, bytes24 mobileUnit, bytes memory payload) public override {
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

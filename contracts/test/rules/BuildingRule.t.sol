// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "../helpers/GameTest.sol";
import {BuildingKind} from "@ds/ext/BuildingKind.sol";

using Schema for State;

contract BuildingRuleTest is Test, GameTest {
    event AnnotationSet(bytes24 id, AnnotationKind kind, string label, bytes32 ref, string data);

    bytes24[4] defaultMaterialItem;
    uint64[4] defaultMaterialQty;

    function setUp() public {
        // setup default material construction costs
        defaultMaterialItem[0] = ItemUtils.GreenGoo();
        defaultMaterialItem[1] = ItemUtils.BlueGoo();
        defaultMaterialItem[2] = ItemUtils.RedGoo();
        defaultMaterialQty[0] = 25;
        defaultMaterialQty[1] = 25;
        defaultMaterialQty[2] = 25;
    }

    function testBuildingKindInfo() public {
        bytes24 buildingKind = Node.BuildingKind(1234, BuildingCategory.ITEM_FACTORY);
        (uint64 id, BuildingCategory category) = state.getBuildingKindInfo(buildingKind);
        assertEq(1234, id);
        assertEq(uint64(BuildingCategory.ITEM_FACTORY), uint64(category));
    }

    function testConstructBuilding() public {
        // register a building kind
        bytes24 buildingKind = Node.BuildingKind(20);
        string memory buildingName = "hut";
        bytes24[4] memory inputItemIDs;
        uint64[4] memory inputQtys;

        // TODO: Is this test for name annotions necessary anymore?
        // vm.expectEmit(true, true, true, true, address(state));
        // emit AnnotationSet(buildingKind, AnnotationKind.CALLDATA, "name", keccak256(bytes(buildingName)), buildingName);
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
        // spawn a mobileUnit
        vm.startPrank(players[0].addr);
        bytes24 mobileUnit = _spawnMobileUnitWithResources(players[0].addr);
        // discover an adjacent tile for our building site
        (int16 z, int16 q, int16 r, int16 s) = (0, 1, -1, 0);
        dev.spawnTile(z, q, r, s);
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
            state.getOwner(buildingInstance), Node.Player(players[0].addr), "expected building to be owned by alice"
        );
        // check building has kind
        assertEq(state.getBuildingKind(buildingInstance), buildingKind, "expected building to have kind");
        // check building has a bag equip
        assertTrue(state.getEquipSlot(buildingInstance, 0) != 0x0, "expected building to have a bag equip");
    }

    function testConstructFailPayment() public {
        vm.startPrank(players[0].addr);
        // register a building kind
        bytes24 buildingKind = Node.BuildingKind(25);
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
        // spawn a mobileUnit
        bytes24 mobileUnit = _spawnMobileUnitWithResources(players[0].addr);
        // discover an adjacent tile for our building site
        (int16 z, int16 q, int16 r, int16 s) = (0, 1, -1, 0);
        dev.spawnTile(z, q, r, s);
        // get our building and give it not enough resources to construct
        bytes24 buildingInstance = Node.Building(z, q, r, s);
        _transferFromMobileUnit(mobileUnit, 0, 1, buildingInstance); // 1 is intentionaly too few
        _transferFromMobileUnit(mobileUnit, 1, 1, buildingInstance); // ...
        _transferFromMobileUnit(mobileUnit, 2, 1, buildingInstance); // ...
        // construct our building
        vm.expectRevert("input 0 qty does not match construction recipe");
        dispatcher.dispatch(abi.encodeCall(Actions.CONSTRUCT_BUILDING_MOBILE_UNIT, (buildingKind, z, q, r, s)));
        vm.stopPrank();
    }

    function testConstructFailStackableMaterial() public {
        vm.startPrank(players[0].addr);
        // register building with a a non-stackable construction material
        uint64[4] memory qtys;
        qtys[0] = 1;
        bytes24[4] memory materials;
        materials[0] = Node.Item("non-stackable-ball", [uint32(20), uint32(20), uint32(20)], false);
        dispatcher.dispatch(abi.encodeCall(Actions.REGISTER_ITEM_KIND, (materials[0], "non-stackable-ball", "00-00")));
        // register a building kind
        bytes24 buildingKind = Node.BuildingKind(25);
        string memory buildingName = "hut";
        bytes24[4] memory inputItemIDs;
        uint64[4] memory inputQtys;

        vm.expectRevert("non-stackable items not allowed as construction materials");
        dispatcher.dispatch(
            abi.encodeCall(
                Actions.REGISTER_BUILDING_KIND,
                (
                    buildingKind,
                    buildingName,
                    BuildingCategory.NONE,
                    "",
                    materials,
                    qtys,
                    inputItemIDs,
                    inputQtys,
                    [bytes24(0)],
                    [uint64(0)]
                )
            )
        );
        vm.stopPrank();
    }

    function testConstructFailMobileUnitTooFarAway() public {
        _testConstructFailNotAdjacent(0, 2, -2, 0);
    }

    function testConstructFailMobileUnitNotDirect() public {
        _testConstructFailNotAdjacent(0, 1, -2, 1);
    }

    function testRegisterBuildingKindContract() public {
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
        // register a contract implementation for the building kind
        address buildingContractAddr = vm.addr(0xb001);
        dispatcher.dispatch(abi.encodeCall(Actions.REGISTER_KIND_IMPLEMENTATION, (buildingKind, buildingContractAddr)));
        // check building kind has implementation
        assertEq(
            state.getImplementation(buildingKind),
            buildingContractAddr,
            "expected building kind to have an implementation"
        );
    }

    function testUseBuilding() public {
        // register a building kind
        bytes24 buildingKind = Node.BuildingKind(100);
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
        MockBuildingKind mockBuilding = new MockBuildingKind();
        dispatcher.dispatch(abi.encodeCall(Actions.REGISTER_KIND_IMPLEMENTATION, (buildingKind, address(mockBuilding))));
        // discover an adjacent tile for our building site
        (int16 z, int16 q, int16 r, int16 s) = (0, 1, -1, 0);
        dev.spawnTile(z, q, r, s);
        // spawn a mobileUnit
        vm.startPrank(players[0].addr);
        bytes24 mobileUnit = _spawnMobileUnitWithResources(players[0].addr);
        // get our building and give it the resources to construct
        bytes24 buildingInstance = Node.Building(z, q, r, s);
        _transferFromMobileUnit(mobileUnit, 0, 25, buildingInstance);
        _transferFromMobileUnit(mobileUnit, 1, 25, buildingInstance);
        _transferFromMobileUnit(mobileUnit, 2, 25, buildingInstance);
        // construct our building
        dispatcher.dispatch(abi.encodeCall(Actions.CONSTRUCT_BUILDING_MOBILE_UNIT, (buildingKind, z, q, r, s)));
        // use the building
        bytes memory payload = bytes("CUSTOM_PAYLOAD");
        dispatcher.dispatch(abi.encodeCall(Actions.BUILDING_USE, (buildingInstance, mobileUnit, payload)));
        // check that the building implementation was called
        assertEq(mockBuilding.getUseCallCount(), 1, "expected mock building to have been called on use");

        (Game gameArg, bytes24 buildingArg, bytes24 mobileUnitArg, uint256 payloadLen) = mockBuilding.useCalls(0);
        assertEq(address(gameArg), address(game), "expected mock building to get passed the mobileUnit");
        assertEq(buildingArg, buildingInstance, "expected mock building to get passed the mobileUnit");
        assertEq(mobileUnitArg, mobileUnit, "expected mock building to get passed the mobileUnit");
        assertEq(payloadLen, payload.length, "expected mock building to get passed the mobileUnit");
        vm.stopPrank();
    }

    function _testConstructFailNotAdjacent(int16 z, int16 q, int16 r, int16 s) private {
        // register a building kind
        bytes24 buildingKind = Node.BuildingKind(30);
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
        // spawn a mobileUnit
        vm.startPrank(players[0].addr);
        _spawnMobileUnitWithResources(players[0].addr);
        // target building site
        dev.spawnTile(z, q, r, s);
        // get our building and magic it the resources to construct
        bytes24 buildingInstance = Node.Building(z, q, r, s);
        bytes24 buildingBag = Node.Bag(uint64(uint256(keccak256(abi.encode(buildingInstance)))));
        state.setEquipSlot(buildingInstance, 0, buildingBag);
        state.setItemSlot(buildingBag, 0, ItemUtils.GreenGoo(), 100);
        state.setItemSlot(buildingBag, 1, ItemUtils.BlueGoo(), 100);
        state.setItemSlot(buildingBag, 2, ItemUtils.RedGoo(), 100);
        // construct our building
        vm.expectRevert("BuildingMustBeAdjacentToMobileUnit"); // expect fail as q/r/s not adjacent
        dispatcher.dispatch(abi.encodeCall(Actions.CONSTRUCT_BUILDING_MOBILE_UNIT, (buildingKind, z, q, r, s)));
        vm.stopPrank();
    }

    // _spawnMobileUnitWithResources spawns a mobileUnit for the current sender at
    // 0,0,0 with 100 of each resource in an equiped bag
    function _spawnMobileUnitWithResources(address player) private returns (bytes24) {
        dev.spawnTile(0, 0, 0, 0);
        spawnMobileUnit();
        bytes24 mobileUnit = Node.MobileUnit(player);
        dev.spawnFullBag(state.getOwnerAddress(mobileUnit), mobileUnit, 0);

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

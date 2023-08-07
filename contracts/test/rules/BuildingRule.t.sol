// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";

import {Game} from "cog/Game.sol";
import {State, AnnotationKind} from "cog/State.sol";
import {Dispatcher} from "cog/Dispatcher.sol";

import {Game as Downstream} from "@ds/Game.sol";
import {Actions, BiomeKind} from "@ds/actions/Actions.sol";
import {Schema, Node, Rel, LocationKey, DEFAULT_ZONE} from "@ds/schema/Schema.sol";
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
    uint64 sid;

    bytes24[4] defaultMaterialItem;
    uint64[4] defaultMaterialQty;

    function setUp() public {
        // setup users
        uint256 alicePrivateKey = 0xA11CE;
        aliceAccount = vm.addr(alicePrivateKey);

        // setup allowlist
        address[] memory allowlist = new address[](1);
        allowlist[0] = aliceAccount;

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
    }

    function testConstructBuilding() public {
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
        // spawn a mobileUnit
        vm.startPrank(aliceAccount);
        bytes24 mobileUnit = _spawnMobileUnitWithResources();
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
        assertEq(state.getOwner(buildingInstance), Node.Player(aliceAccount), "expected building to be owned by alice");
        // check building has kind
        assertEq(state.getBuildingKind(buildingInstance), buildingKind, "expected building to have kind");
        // check building has a bag equip
        assertTrue(state.getEquipSlot(buildingInstance, 0) != 0x0, "expected building to have a bag equip");
    }

    function testConstructFailPayment() public {
        vm.startPrank(aliceAccount);
        // register a building kind
        bytes24 buildingKind = Node.BuildingKind(25);
        dispatcher.dispatch(
            abi.encodeCall(
                Actions.REGISTER_BUILDING_KIND, (buildingKind, "hut", defaultMaterialItem, defaultMaterialQty)
            )
        );
        // spawn a mobileUnit
        bytes24 mobileUnit = _spawnMobileUnitWithResources();
        // discover an adjacent tile for our building site
        (int16 q, int16 r, int16 s) = (1, -1, 0);
        _discover(q, r, s);
        // get our building and give it not enough resources to construct
        bytes24 buildingInstance = Node.Building(DEFAULT_ZONE, q, r, s);
        _transferFromMobileUnit(mobileUnit, 0, 1, buildingInstance); // 1 is intentionaly too few
        _transferFromMobileUnit(mobileUnit, 1, 1, buildingInstance); // ...
        _transferFromMobileUnit(mobileUnit, 2, 1, buildingInstance); // ...
        // construct our building
        vm.expectRevert("input 0 qty does not match construction recipe");
        dispatcher.dispatch(abi.encodeCall(Actions.CONSTRUCT_BUILDING_MOBILE_UNIT, (mobileUnit, buildingKind, q, r, s)));
        vm.stopPrank();
    }

    function testConstructFailStackableMaterial() public {
        vm.startPrank(aliceAccount);
        // register building with a a non-stackable construction material
        uint64[4] memory qtys;
        qtys[0] = 1;
        bytes24[4] memory materials;
        materials[0] = Node.Item("non-stackable-ball", [uint32(20), uint32(20), uint32(20)], false);
        dispatcher.dispatch(abi.encodeCall(Actions.REGISTER_ITEM_KIND, (materials[0], "non-stackable-ball", "00-00")));
        bytes24 buildingKind = Node.BuildingKind(25);
        vm.expectRevert("non-stackable items not allowed as construction materials");
        dispatcher.dispatch(abi.encodeCall(Actions.REGISTER_BUILDING_KIND, (buildingKind, "hut", materials, qtys)));
        vm.stopPrank();
    }

    function testConstructFailMobileUnitTooFarAway() public {
        _testConstructFailNotAdjacent(2, -2, 0);
    }

    function testConstructFailMobileUnitNotDirect() public {
        _testConstructFailNotAdjacent(1, -2, 1);
    }

    function testRegisterBuildingKindContract() public {
        // register a building kind
        bytes24 buildingKind = Node.BuildingKind(20);
        dispatcher.dispatch(
            abi.encodeCall(
                Actions.REGISTER_BUILDING_KIND, (buildingKind, "hut", defaultMaterialItem, defaultMaterialQty)
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
        dispatcher.dispatch(
            abi.encodeCall(
                Actions.REGISTER_BUILDING_KIND, (buildingKind, "hut", defaultMaterialItem, defaultMaterialQty)
            )
        );
        // register a mock implementation for the building
        MockBuildingKind mockBuilding = new MockBuildingKind();
        dispatcher.dispatch(abi.encodeCall(Actions.REGISTER_KIND_IMPLEMENTATION, (buildingKind, address(mockBuilding))));
        // discover an adjacent tile for our building site
        (int16 q, int16 r, int16 s) = (1, -1, 0);
        _discover(q, r, s);
        // spawn a mobileUnit
        vm.startPrank(aliceAccount);
        bytes24 mobileUnit = _spawnMobileUnitWithResources();
        // get our building and give it the resources to construct
        bytes24 buildingInstance = Node.Building(DEFAULT_ZONE, q, r, s);
        _transferFromMobileUnit(mobileUnit, 0, 25, buildingInstance);
        _transferFromMobileUnit(mobileUnit, 1, 25, buildingInstance);
        _transferFromMobileUnit(mobileUnit, 2, 25, buildingInstance);
        // construct our building
        dispatcher.dispatch(abi.encodeCall(Actions.CONSTRUCT_BUILDING_MOBILE_UNIT, (mobileUnit, buildingKind, q, r, s)));
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

    function _testConstructFailNotAdjacent(int16 q, int16 r, int16 s) private {
        // register a building kind
        bytes24 buildingKind = Node.BuildingKind(30);
        dispatcher.dispatch(
            abi.encodeCall(
                Actions.REGISTER_BUILDING_KIND, (buildingKind, "hut", defaultMaterialItem, defaultMaterialQty)
            )
        );
        // spawn a mobileUnit
        vm.startPrank(aliceAccount);
        bytes24 mobileUnit = _spawnMobileUnitWithResources();
        // target building site
        _discover(q, r, s);
        // get our building and magic it the resources to construct
        bytes24 buildingInstance = Node.Building(DEFAULT_ZONE, q, r, s);
        bytes24 buildingBag = Node.Bag(uint64(uint256(keccak256(abi.encode(buildingInstance)))));
        state.setEquipSlot(buildingInstance, 0, buildingBag);
        state.setItemSlot(buildingBag, 0, ItemUtils.GlassGreenGoo(), 100);
        state.setItemSlot(buildingBag, 1, ItemUtils.BeakerBlueGoo(), 100);
        state.setItemSlot(buildingBag, 2, ItemUtils.FlaskRedGoo(), 100);
        // construct our building
        vm.expectRevert("BuildingMustBeAdjacentToMobileUnit"); // expect fail as q/r/s not adjacent
        dispatcher.dispatch(abi.encodeCall(Actions.CONSTRUCT_BUILDING_MOBILE_UNIT, (mobileUnit, buildingKind, q, r, s)));
        vm.stopPrank();
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

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";

import {Game} from "cog/Game.sol";
import {State, AnnotationKind} from "cog/State.sol";
import {Dispatcher} from "cog/Dispatcher.sol";

import {Game as Dawnseekers} from "@ds/Game.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {Schema, Node, Rel, LocationKey, BiomeKind, ResourceKind, DEFAULT_ZONE} from "@ds/schema/Schema.sol";
import {
    BUILDING_COST,
    BuildingResourceRequirementsNotMet,
    BuildingMustBeAdjacentToSeeker
} from "@ds/rules/BuildingRule.sol";
import {BuildingKind} from "@ds/ext/BuildingKind.sol";

using Schema for State;

uint32 constant TEST_SEEKER_ID = 1;

uint8 constant EQUIP_SLOT_0 = 0;
uint8 constant EQUIP_SLOT_1 = 1;

uint8 constant ITEM_SLOT_0 = 0;
uint8 constant ITEM_SLOT_1 = 1;

contract BuildingRuleTest is Test {
    event AnnotationSet(bytes24 id, AnnotationKind kind, string label, bytes32 ref, string data);

    Game internal game;
    Dispatcher internal dispatcher;
    State internal state;

    // accounts
    address aliceAccount;

    function setUp() public {
        // setup game
        game = new Dawnseekers();
        dispatcher = game.getDispatcher();

        // fetch the State to play with
        state = game.getState();

        // setup users
        uint256 alicePrivateKey = 0xA11CE;
        aliceAccount = vm.addr(alicePrivateKey);
    }

    function testConstructBuilding() public {
        // register a building kind
        bytes24 buildingKind = Node.BuildingKind(20);
        string memory buildingName = "hut";
        vm.expectEmit(true, true, true, true, address(state));
        emit AnnotationSet(buildingKind, AnnotationKind.CALLDATA, "name", keccak256(bytes(buildingName)), buildingName);
        dispatcher.dispatch(abi.encodeCall(Actions.REGISTER_BUILDING_KIND, (buildingKind, "hut")));
        // spawn a seeker
        bytes24 seeker = _spawnSeeker(aliceAccount, 1, 0, 0, 0);
        // equip the seeker with a bag with enough wood
        _spawnBagWithWood(1, aliceAccount, seeker, EQUIP_SLOT_0, BUILDING_COST);
        // discover an adjacent tile for our building site
        (int16 q, int16 r, int16 s) = (1, -1, 0);
        _discover(q, r, s);
        // construct our building
        vm.startPrank(aliceAccount);
        dispatcher.dispatch(
            abi.encodeCall(
                Actions.CONSTRUCT_BUILDING_SEEKER,
                (
                    seeker,
                    buildingKind,
                    seeker, // which thing is bag attached to
                    EQUIP_SLOT_0, // which equip slot on the thing
                    ITEM_SLOT_0, // which item slot contains resource
                    q,
                    r,
                    s
                )
            )
        );
        vm.stopPrank();
        // make full building id
        bytes24 buildingInstance = Node.Building(DEFAULT_ZONE, q, r, s);
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
    }

    function testConstructFailPayment() public {
        // register a building kind
        bytes24 buildingKind = Node.BuildingKind(25);
        dispatcher.dispatch(abi.encodeCall(Actions.REGISTER_BUILDING_KIND, (buildingKind, "hut")));
        // spawn a seeker
        bytes24 seeker = _spawnSeeker(aliceAccount, 1, 0, 0, 0);
        // equip the seeker with a bag with enough wood
        _spawnBagWithWood(
            1,
            aliceAccount,
            seeker,
            EQUIP_SLOT_0,
            BUILDING_COST - 1 // one less than required
        );
        // target building site
        (int16 q, int16 r, int16 s) = (0, 0, 0);
        _discover(q, r, s);
        // construct our building
        vm.startPrank(aliceAccount);
        vm.expectRevert(BuildingResourceRequirementsNotMet.selector); // expect fail as one wood short
        dispatcher.dispatch(
            abi.encodeCall(
                Actions.CONSTRUCT_BUILDING_SEEKER,
                (
                    seeker,
                    buildingKind,
                    seeker, // which thing is bag attached to
                    EQUIP_SLOT_0, // which equip slot on the thing
                    ITEM_SLOT_0, // which item slot contains resource
                    q,
                    r,
                    s
                )
            )
        );
        vm.stopPrank();
    }

    function testConstructFailSeekerTooFarAway() public {
        _testConstructFailNotAdjacent(2, -2, 0);
    }

    function testConstructFailSeekerNotDirect() public {
        _testConstructFailNotAdjacent(1, -1, 1);
    }

    function testRegisterBuildingKindContract() public {
        // register a building kind
        bytes24 buildingKind = Node.BuildingKind(20);
        dispatcher.dispatch(abi.encodeCall(Actions.REGISTER_BUILDING_KIND, (buildingKind, "hut")));
        // register a contract implementation for the building kind
        address buildingContractAddr = vm.addr(0xb001);
        dispatcher.dispatch(abi.encodeCall(Actions.REGISTER_BUILDING_CONTRACT, (buildingKind, buildingContractAddr)));
        // check building kind has implementation
        assertEq(
            state.getImplementation(buildingKind),
            buildingContractAddr,
            "expected building kind to have an implementation"
        );
    }

    function testUseBuilding() public {
        vm.startPrank(aliceAccount);
        // register a building kind
        bytes24 buildingKind = Node.BuildingKind(100);
        dispatcher.dispatch(abi.encodeCall(Actions.REGISTER_BUILDING_KIND, (buildingKind, "hut")));
        // register a mock implementation for the building
        MockBuildingKind mockBuilding = new MockBuildingKind();
        dispatcher.dispatch(abi.encodeCall(Actions.REGISTER_BUILDING_CONTRACT, (buildingKind, address(mockBuilding))));
        // location to do business
        (int16 q, int16 r, int16 s) = (0, 0, 0);
        _discover(q, r, s);
        // spawn a seeker with some resources
        bytes24 seeker = _spawnSeeker(aliceAccount, 1, q, r, s);
        _spawnBagWithWood(1, aliceAccount, seeker, EQUIP_SLOT_0, BUILDING_COST);
        // construct a building of our kind
        dispatcher.dispatch(
            abi.encodeCall(
                Actions.CONSTRUCT_BUILDING_SEEKER,
                (
                    seeker,
                    buildingKind,
                    seeker, // which thing is bag attached to
                    EQUIP_SLOT_0, // which equip slot on the thing
                    ITEM_SLOT_0, // which item slot contains resource
                    q,
                    r,
                    s
                )
            )
        );
        // use the building
        bytes24 buildingInstance = Node.Building(DEFAULT_ZONE, q, r, s);
        bytes memory payload = bytes("CUSTOM_PAYLOAD");
        dispatcher.dispatch(abi.encodeCall(Actions.BUILDING_USE, (buildingInstance, seeker, payload)));
        // check that the building implementation was called
        assertEq(mockBuilding.getUseCallCount(), 1, "expected mock building to have been called on use");

        (Game gameArg, bytes24 buildingArg, bytes24 seekerArg, uint256 payloadLen) = mockBuilding.useCalls(0);
        assertEq(address(gameArg), address(game), "expected mock building to get passed the seeker");
        assertEq(buildingArg, buildingInstance, "expected mock building to get passed the seeker");
        assertEq(seekerArg, seeker, "expected mock building to get passed the seeker");
        assertEq(payloadLen, payload.length, "expected mock building to get passed the seeker");
        vm.stopPrank();
    }

    function _testConstructFailNotAdjacent(int16 q, int16 r, int16 s) private {
        // register a building kind
        bytes24 buildingKind = Node.BuildingKind(30);
        dispatcher.dispatch(abi.encodeCall(Actions.REGISTER_BUILDING_KIND, (buildingKind, "hut")));
        // spawn a seeker
        bytes24 seeker = _spawnSeeker(aliceAccount, 1, 0, 0, 0);
        // equip the seeker with a bag with enough wood
        _spawnBagWithWood(1, aliceAccount, seeker, EQUIP_SLOT_0, BUILDING_COST);
        // target building site
        _discover(q, r, s);
        // construct our building
        vm.startPrank(aliceAccount);
        vm.expectRevert(BuildingMustBeAdjacentToSeeker.selector); // expect fail as q/r/s not adjacent
        dispatcher.dispatch(
            abi.encodeCall(
                Actions.CONSTRUCT_BUILDING_SEEKER,
                (
                    seeker,
                    buildingKind,
                    seeker, // which thing is bag attached to
                    EQUIP_SLOT_0, // which equip slot on the thing
                    ITEM_SLOT_0, // which item slot contains resource
                    q,
                    r,
                    s
                )
            )
        );
        vm.stopPrank();
    }

    function _spawnBagWithWood(uint64 bagID, address owner, bytes24 equipNode, uint8 equipSlot, uint64 qty)
        private
        returns (bytes24)
    {
        bytes24[] memory items = new bytes24[](1);
        items[0] = Node.Resource(ResourceKind.WOOD);
        uint64[] memory balances = new uint64[](1);
        balances[0] = qty;
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

contract MockBuildingKind is BuildingKind {
    struct UseArgs {
        Game game;
        bytes24 building;
        bytes24 seeker;
        uint256 payloadLen;
    }

    UseArgs[] public useCalls;

    function use(Game game, bytes24 building, bytes24 seeker, bytes memory payload) public {
        UseArgs storage call = useCalls.push();
        call.game = game;
        call.building = building;
        call.seeker = seeker;
        call.payloadLen = payload.length;
    }

    function getUseCallCount() public view returns (uint256) {
        return useCalls.length;
    }
}

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";

import {Game} from "cog/Game.sol";
import {State, AnnotationKind} from "cog/State.sol";
import {Dispatcher} from "cog/Dispatcher.sol";

import {Game as Dawnseekers} from "@ds/Game.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {Schema, Node, Rel, LocationKey, BiomeKind, DEFAULT_ZONE} from "@ds/schema/Schema.sol";
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
        game = new Dawnseekers(allowlist);
        dispatcher = game.getDispatcher();

        // fetch the State to play with
        state = game.getState();

        // setup default material construction costs
        defaultMaterialItem[0] = ItemUtils.Kiki();
        defaultMaterialItem[1] = ItemUtils.Bouba();
        defaultMaterialItem[2] = ItemUtils.Semiote();
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
        // spawn a seeker
        vm.startPrank(aliceAccount);
        bytes24 seeker = _spawnSeekerWithResources();
        // discover an adjacent tile for our building site
        (int16 q, int16 r, int16 s) = (1, -1, 0);
        _discover(q, r, s);
        // get our building and give it the resources to construct
        bytes24 buildingInstance = Node.Building(DEFAULT_ZONE, q, r, s);
        // construct our building
        _transferFromSeeker(seeker, 0, 25, buildingInstance);
        _transferFromSeeker(seeker, 1, 25, buildingInstance);
        _transferFromSeeker(seeker, 2, 25, buildingInstance);
        dispatcher.dispatch(abi.encodeCall(Actions.CONSTRUCT_BUILDING_SEEKER, (seeker, buildingKind, q, r, s)));
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
        // spawn a seeker
        bytes24 seeker = _spawnSeekerWithResources();
        // discover an adjacent tile for our building site
        (int16 q, int16 r, int16 s) = (1, -1, 0);
        _discover(q, r, s);
        // get our building and give it not enough resources to construct
        bytes24 buildingInstance = Node.Building(DEFAULT_ZONE, q, r, s);
        _transferFromSeeker(seeker, 0, 1, buildingInstance); // 1 is intentionaly too few
        _transferFromSeeker(seeker, 1, 1, buildingInstance); // ...
        _transferFromSeeker(seeker, 2, 1, buildingInstance); // ...
        // construct our building
        vm.expectRevert("input 0 qty does not match construction recipe");
        dispatcher.dispatch(abi.encodeCall(Actions.CONSTRUCT_BUILDING_SEEKER, (seeker, buildingKind, q, r, s)));
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
        // spawn a seeker
        vm.startPrank(aliceAccount);
        bytes24 seeker = _spawnSeekerWithResources();
        // get our building and give it the resources to construct
        bytes24 buildingInstance = Node.Building(DEFAULT_ZONE, q, r, s);
        _transferFromSeeker(seeker, 0, 25, buildingInstance);
        _transferFromSeeker(seeker, 1, 25, buildingInstance);
        _transferFromSeeker(seeker, 2, 25, buildingInstance);
        // construct our building
        dispatcher.dispatch(abi.encodeCall(Actions.CONSTRUCT_BUILDING_SEEKER, (seeker, buildingKind, q, r, s)));
        // use the building
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
        dispatcher.dispatch(
            abi.encodeCall(
                Actions.REGISTER_BUILDING_KIND, (buildingKind, "hut", defaultMaterialItem, defaultMaterialQty)
            )
        );
        // spawn a seeker
        vm.startPrank(aliceAccount);
        bytes24 seeker = _spawnSeekerWithResources();
        // target building site
        _discover(q, r, s);
        // get our building and magic it the resources to construct
        bytes24 buildingInstance = Node.Building(DEFAULT_ZONE, q, r, s);
        bytes24 buildingBag = Node.Bag(uint64(uint256(keccak256(abi.encode(buildingInstance)))));
        state.setEquipSlot(buildingInstance, 0, buildingBag);
        state.setItemSlot(buildingBag, 0, ItemUtils.Kiki(), 100);
        state.setItemSlot(buildingBag, 1, ItemUtils.Bouba(), 100);
        state.setItemSlot(buildingBag, 2, ItemUtils.Semiote(), 100);
        // construct our building
        vm.expectRevert("BuildingMustBeAdjacentToSeeker"); // expect fail as q/r/s not adjacent
        dispatcher.dispatch(abi.encodeCall(Actions.CONSTRUCT_BUILDING_SEEKER, (seeker, buildingKind, q, r, s)));
        vm.stopPrank();
    }

    // _spawnSeekerWithResources spawns a seeker for the current sender at
    // 0,0,0 with 100 of each resource in an equiped bag
    function _spawnSeekerWithResources() private returns (bytes24) {
        sid++;
        bytes24 seeker = Node.Seeker(sid);
        _discover(0, 0, 0);
        dispatcher.dispatch(abi.encodeCall(Actions.SPAWN_SEEKER, (seeker)));
        bytes24[] memory items = new bytes24[](3);
        items[0] = ItemUtils.Kiki();
        items[1] = ItemUtils.Bouba();
        items[2] = ItemUtils.Semiote();

        uint64[] memory balances = new uint64[](3);
        balances[0] = 100;
        balances[1] = 100;
        balances[2] = 100;

        uint64 seekerBag = uint64(uint256(keccak256(abi.encode(seeker))));
        dispatcher.dispatch(
            abi.encodeCall(
                Actions.DEV_SPAWN_BAG, (seekerBag, state.getOwnerAddress(seeker), seeker, 0, items, balances)
            )
        );

        return seeker;
    }

    function _transferFromSeeker(bytes24 seeker, uint8 slot, uint64 qty, bytes24 toBuilding) private {
        bytes24 buildingBag = Node.Bag(uint64(uint256(keccak256(abi.encode(toBuilding)))));
        dispatcher.dispatch(
            abi.encodeCall(
                Actions.TRANSFER_ITEM_SEEKER, (seeker, [seeker, toBuilding], [0, 0], [slot, slot], buildingBag, qty)
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

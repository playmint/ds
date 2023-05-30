// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";

import {State} from "cog/State.sol";
import {Dispatcher} from "cog/Dispatcher.sol";

import {Game} from "@ds/Game.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {Schema, Node, Rel, LocationKey, BiomeKind, DEFAULT_ZONE} from "@ds/schema/Schema.sol";
import {NoMoveNotOwner, NoMoveToIndirect, NoMoveToUndiscovered} from "@ds/rules/MovementRule.sol";

using Schema for State;

uint32 constant TEST_SEEKER_ID = 1;

contract MovementRuleTest is Test {
    Game internal game;
    Dispatcher internal dispatcher;
    State internal state;

    // accounts
    address aliceAccount;

    function setUp() public {
        // setup users
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

        // discover a star shape of tiles 6-axis from center
        for (int16 i = 0; i < 3; i++) {
            _discover(0, -i, i);
            _discover(0, i, -i);
            _discover(i, 0, -i);
            _discover(-i, 0, i);
            _discover(-i, i, 0);
            _discover(i, -i, 0);
        }

        // place a seeker at 0,0,0
        vm.startPrank(aliceAccount);
        game.getDispatcher().dispatch(abi.encodeCall(Actions.SPAWN_SEEKER, (Node.Seeker(TEST_SEEKER_ID))));
        vm.stopPrank();
    }

    function testMoveSE() public {
        _testMoveTo(0, 1, -1);
    }

    function testMoveNW() public {
        _testMoveTo(0, -1, 1);
    }

    function testMoveE() public {
        _testMoveTo(1, 0, -1);
    }

    function testMoveW() public {
        _testMoveTo(-1, 0, 1);
    }

    function testMoveNE() public {
        _testMoveTo(1, -1, 0);
    }

    function testMoveSW() public {
        _testMoveTo(-1, 1, 0);
    }

    function testMoveWhenMoving() public {
        // be alice
        vm.startPrank(aliceAccount);
        bytes24 seeker = Node.Seeker(TEST_SEEKER_ID);
        // move 2 tiles away
        _tryMoveTo(0, 2, -2);
        // assuming speed is 1 tile per block
        // if we move 1 block forward we should be at (0,1,-1)
        // TODO: this test will break if TRAVEL_SPEED changes, fix it!
        vm.roll(block.number + 1);
        assertEq(
            state.getCurrentLocation(seeker, uint64(block.number)),
            Node.Tile(DEFAULT_ZONE, 0, 1, -1),
            "expected current location to be 0,1,-1 as we are halfway"
        );
        // try to move away from current location...
        // _discover(-1,1,0);
        _tryMoveTo(-1, 1, 0);
        assertEq(
            state.getPrevLocation(seeker), Node.Tile(DEFAULT_ZONE, 0, 1, -1), "expected prev location to now be 0,1,-1"
        );
        assertEq(
            state.getCurrentLocation(seeker, uint64(block.number)),
            Node.Tile(DEFAULT_ZONE, 0, 1, -1),
            "expected current location to still be 0,1,-1 after new move issued"
        );
        assertEq(
            state.getNextLocation(seeker),
            Node.Tile(DEFAULT_ZONE, -1, 1, 0),
            "expected next location to be -1,1,0 after new move issued"
        );
        // move time forward
        (, uint64 arrivalTime) = state.get(Rel.Location.selector, uint8(LocationKey.NEXT), seeker);
        vm.roll(arrivalTime); // let time pass
        // we should now have arrived at -1,2,1
        assertEq(
            state.getCurrentLocation(seeker, uint64(block.number)),
            Node.Tile(DEFAULT_ZONE, -1, 1, 0),
            "expected arrive at -1,1,0"
        );
        // stop being alice
        vm.stopPrank();
    }

    function testNoMoveNotOwner() public {
        vm.expectRevert(NoMoveNotOwner.selector);
        _tryMoveTo(0, 1, 1); // should fail without prank
    }

    function testNoMoveToUndiscovered() public {
        vm.startPrank(aliceAccount);
        vm.expectRevert(NoMoveToUndiscovered.selector);
        _tryMoveTo(0, -5, -5);
        vm.stopPrank();
    }

    function testNoMoveIndirect() public {
        vm.startPrank(aliceAccount);
        _tryMoveTo(0, -2, 2);
        vm.roll(block.number + 100); // resolve the move
        vm.expectRevert(NoMoveToIndirect.selector);
        _tryMoveTo(1, -1, 0);
        vm.stopPrank();
    }

    function _testMoveTo(int16 q, int16 r, int16 s) private {
        // dispatch as alice
        vm.startPrank(aliceAccount);
        _tryMoveTo(q, r, s);

        bytes24 seeker = Node.Seeker(TEST_SEEKER_ID);

        assertEq(
            state.getNextLocation(seeker), Node.Tile(0, q, r, s), "expected seeker next location to be correctly set"
        );

        assertEq(
            state.getCurrentLocation(seeker, uint64(block.number)),
            Node.Tile(DEFAULT_ZONE, 0, 0, 0),
            "expected current location to still be 0,0,0 as no time passed"
        );

        (, uint64 arrivalTime) = state.get(Rel.Location.selector, uint8(LocationKey.NEXT), seeker);
        vm.roll(arrivalTime); // let time pass

        assertEq(
            state.getCurrentLocation(Node.Seeker(TEST_SEEKER_ID), uint64(block.number)),
            Node.Tile(DEFAULT_ZONE, q, r, s),
            "expected current location to now be same as next location"
        );
        // stop being alice
        vm.stopPrank();
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

    function _tryMoveTo(int16 q, int16 r, int16 s) private {
        dispatcher.dispatch(
            abi.encodeCall(
                Actions.MOVE_SEEKER,
                (
                    TEST_SEEKER_ID, // seeker id (sid)
                    q, // q
                    r, // r
                    s // s
                )
            )
        );
    }
}

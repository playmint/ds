// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";

import {State} from "cog/State.sol";
import {Dispatcher} from "cog/Dispatcher.sol";

import {Game} from "@ds/Game.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {Schema, Node, Rel, LocationKey, BiomeKind, DEFAULT_ZONE} from "@ds/schema/Schema.sol";

using Schema for State;

uint32 constant TEST_MOBILE_UNIT_ID = 1;

contract ScoutRuleTest is Test {
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

        // force tile 0,0,0 DISCOVERED
        dispatcher.dispatch(
            abi.encodeCall(
                Actions.DEV_SPAWN_TILE,
                (
                    BiomeKind.DISCOVERED,
                    0, // q
                    0, // r
                    0 // s
                )
            )
        );

        // place a mobileUnit at 0,0,0
        vm.startPrank(aliceAccount);
        dispatcher.dispatch(abi.encodeCall(Actions.SPAWN_MOBILE_UNIT, (Node.MobileUnit(TEST_MOBILE_UNIT_ID))));
        vm.stopPrank();
    }

    function testScoutErrorAlreadyDiscovered() public {
        vm.startPrank(aliceAccount);
        vm.expectRevert("NoScoutAlreadyDiscovered");
        _scout(0, 0, 0); // expect fail as 0,0,0 already discovered in setUp
        vm.stopPrank();
    }

    function testScoutErrorNotOwner() public {
        vm.expectRevert("NoScoutNotOwner");
        _scout(0, 1, -1); // expect fail as no prank
    }

    function testScoutNotAdjacent() public {
        vm.startPrank(aliceAccount);
        vm.expectRevert("NoScoutUnadjacent");
        _scout(0, 2, -2); // expect fail as too far away from mobileUnit at 0,0,0
        vm.stopPrank();
    }

    function testScoutUndiscovered() public {
        int16 q = 0;
        int16 r = 1;
        int16 s = -1;

        // be alice
        vm.startPrank(aliceAccount);

        bytes24 targetTile = Node.Tile(DEFAULT_ZONE, q, r, s);

        assertEq(
            uint256(state.getBiome(targetTile)),
            uint256(BiomeKind.UNDISCOVERED),
            "expected target tile to be UNDISCOVERED to start"
        );

        // dispatch SCOUT_MOBILE_UNIT
        _scout(q, r, s);

        assertEq(
            uint256(state.getBiome(targetTile)),
            uint256(BiomeKind.DISCOVERED),
            "expected target tile to be DISCOVERED after scout"
        );

        // stop being alice
        vm.stopPrank();
    }

    function _scout(int16 q, int16 r, int16 s) private {
        dispatcher.dispatch(
            abi.encodeCall(
                Actions.SCOUT_MOBILE_UNIT,
                (
                    TEST_MOBILE_UNIT_ID, // mobileUnit id (sid)
                    q, // q
                    r, // r
                    s // s
                )
            )
        );
    }
}

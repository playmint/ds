// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";

import {State} from "cog/State.sol";
import {Dispatcher} from "cog/Dispatcher.sol";

import {Game} from "@ds/Game.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {Schema, Node, Rel, BiomeKind, DEFAULT_ZONE} from "@ds/schema/Schema.sol";

using Schema for State;

uint32 constant TEST_SEEKER_ID = 1;

contract NewPlayerRuleTest is Test {
    Game internal game;
    Dispatcher internal dispatcher;
    State internal state;

    // accounts
    address aliceAccount;
    address bobAccount;

    function setUp() public {
        // setup users
        uint256 alicePrivateKey = 0xA11CE;
        aliceAccount = vm.addr(alicePrivateKey);
        uint256 bobPrivateKey = 0xB0B0B;
        bobAccount = vm.addr(bobPrivateKey);

        // setup allowlist ONLY ALICE
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
    }

    function testAliceSpawnSeeker() public {
        vm.startPrank(aliceAccount);
        dispatcher.dispatch(abi.encodeCall(Actions.SPAWN_SEEKER, (Node.Seeker(TEST_SEEKER_ID))));
        vm.stopPrank();
    }

    function testBobCanNotSpawnSeeker() public {
        vm.startPrank(bobAccount);
        vm.expectRevert("NotAllowListed");
        dispatcher.dispatch(abi.encodeCall(Actions.SPAWN_SEEKER, (Node.Seeker(TEST_SEEKER_ID))));
        vm.stopPrank();
    }
}

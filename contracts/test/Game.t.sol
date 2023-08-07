// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";

import {State} from "cog/State.sol";
import {LibString} from "cog/utils/LibString.sol";
import {PREFIX_MESSAGE, REVOKE_MESSAGE} from "cog/SessionRouter.sol";

import {Game} from "@ds/Game.sol";
import {Actions, BiomeKind} from "@ds/actions/Actions.sol";
import {Schema, Node} from "@ds/schema/Schema.sol";

using Schema for State;

contract GameTest is Test {
    Game internal game;
    State internal state;

    // accounts
    uint256 alicePrivateKey;
    address aliceAccount;

    function setUp() public {
        // setup users
        alicePrivateKey = 0xA11CE;
        aliceAccount = vm.addr(alicePrivateKey);

        // setup allowlist
        address[] memory allowlist = new address[](1);
        allowlist[0] = aliceAccount;

        // setup game
        game = new Game(allowlist);

        // fetch the State to play with
        state = game.getState();
    }

    function testSpawn() public {
        // dispatch as alice
        vm.startPrank(aliceAccount);

        // spawn a tile
        game.getDispatcher().dispatch(
            abi.encodeCall(
                Actions.DEV_SPAWN_TILE,
                (
                    BiomeKind.DISCOVERED,
                    1, // q
                    -2, // r
                    1 // s
                )
            )
        );

        // spawn a mobileUnit at that tile
        game.getDispatcher().dispatch(abi.encodeCall(Actions.SPAWN_MOBILE_UNIT, (Node.MobileUnit(1))));

        assertEq(
            state.getCurrentLocation(Node.MobileUnit(1), uint64(block.number)),
            Node.Tile(0, 0, 0, 0),
            "expected next mobileUnit to start at tile 0,0,0"
        );

        // stop being alice
        vm.stopPrank();
    }

    function testAuthorizeAddrWithSignerAsOwner() public {
        // mock account for a fake relayer
        address relayAddr = vm.addr(0xfb1);
        // mock up a session key
        uint256 sessionKey = 0x5e55;
        address sessionAddr = vm.addr(sessionKey);
        // expected custom auth message
        bytes memory authMessage = abi.encodePacked(
            "Welcome to Downstream!",
            "\n\nThis site is requesting permission to interact with your Downstream assets.",
            "\n\nSigning this message will not incur any fees.",
            "\n\nYou can revoke sessions and read more about them at https://downstream.com/sessions",
            "\n\nPermissions: send-actions, spend-energy",
            "\n\nValid: 5 blocks",
            "\n\nSession: ",
            LibString.toHexString(sessionAddr)
        );

        // owner signs the message authorizing the session
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            alicePrivateKey,
            keccak256(abi.encodePacked(PREFIX_MESSAGE, LibString.toString(authMessage.length), authMessage))
        );
        bytes memory sig = abi.encodePacked(r, s, v);

        // relay submits the auth request on behalf of owner
        vm.prank(relayAddr);
        game.getRouter().authorizeAddr(game.getDispatcher(), 5, 0, sessionAddr, sig);

        // should now be able to use sessionKey to sign actions to pass to router
        bytes24 mobileUnit = Node.MobileUnit(111);
        bytes[] memory actions = new bytes[](1);
        actions[0] = abi.encodeCall(Actions.SPAWN_MOBILE_UNIT, (mobileUnit));
        bytes32 digest = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", keccak256(abi.encode(actions))));
        bytes[][] memory batchedActions = new bytes[][](1);
        batchedActions[0] = actions;
        bytes[] memory batchedSigs = new bytes[](1);
        (v, r, s) = vm.sign(sessionKey, digest);
        batchedSigs[0] = abi.encodePacked(r, s, v);
        vm.prank(relayAddr);
        game.getRouter().dispatch(batchedActions, batchedSigs);
        // check the action created mobileUnit with correct owner
        assertEq(state.getOwnerAddress(mobileUnit), aliceAccount);
    }
}

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "./helpers/GameTest.sol";
import {LibString} from "cog/utils/LibString.sol";

using Schema for State;

contract DownstreamTest is Test, GameTest {
    function testSpawn() public {
        // spawn a tile
        dev.spawnTile(0, 1, -2, 1);

        // dispatch as alice
        vm.startPrank(players[0].addr);

        // spawn a mobileUnit at that tile
        dispatcher.dispatch(abi.encodeCall(Actions.SPAWN_MOBILE_UNIT, ()));

        assertEq(
            state.getCurrentLocation(Node.MobileUnit(players[0].addr), uint64(block.number)),
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
            players[0].key,
            keccak256(abi.encodePacked(PREFIX_MESSAGE, LibString.toString(authMessage.length), authMessage))
        );
        bytes memory sig = abi.encodePacked(r, s, v);

        // relay submits the auth request on behalf of owner
        vm.prank(relayAddr);
        game.getRouter().authorizeAddr(game.getDispatcher(), 5, 0, sessionAddr, sig);

        // should now be able to use sessionKey to sign actions to pass to router
        bytes[] memory actions = new bytes[](1);
        actions[0] = abi.encodeCall(Actions.SPAWN_MOBILE_UNIT, ());
        bytes32 digest =
            keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", keccak256(abi.encode(actions, 123))));
        bytes[] memory batchedSigs = new bytes[](1);
        (v, r, s) = vm.sign(sessionKey, digest);
        batchedSigs[0] = abi.encodePacked(r, s, v);
        vm.prank(relayAddr);
        game.getRouter().dispatch(actions, batchedSigs[0], 123); // 123=random nonce
        // check the action created mobileUnit with correct owner
        assertEq(state.getOwnerAddress(Node.MobileUnit(players[0].addr)), players[0].addr);
    }
}

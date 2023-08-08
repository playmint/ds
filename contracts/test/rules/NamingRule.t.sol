// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";

import "cog/IState.sol";
import "cog/IDispatcher.sol";
import "cog/IGame.sol";
import "cog/BaseState.sol";

import {DownstreamGame} from "@ds/Downstream.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {Schema, Node} from "@ds/schema/Schema.sol";

using Schema for State;

contract NamingRuleTest is Test {
    event AnnotationSet(bytes24 id, AnnotationKind kind, string label, bytes32 ref, string data);

    Game internal game;
    Dispatcher internal dispatcher;
    BaseState internal state;

    // accounts
    address aliceAccount;
    address bobAccount;
    uint64 sid;

    function setUp() public {
        // setup users
        aliceAccount = vm.addr(0xA11CE);
        bobAccount = vm.addr(0xB0B0B);

        // setup allowlist
        address[] memory allowlist = new address[](1);
        allowlist[0] = aliceAccount;

        // setup game
        game = new DownstreamGame(allowlist);
        dispatcher = game.getDispatcher();

        // fetch the State to play with
        state = BaseState(address(game.getState()));
    }

    function testNameOwnedEntity() public {
        // spawn a unit
        vm.startPrank(aliceAccount);
        sid++;
        bytes24 entity = Node.MobileUnit(sid);
        dispatcher.dispatch(abi.encodeCall(Actions.SPAWN_MOBILE_UNIT, (entity)));

        // rename the unit
        string memory name = "Jeff";
        dispatcher.dispatch(abi.encodeCall(Actions.NAME_OWNED_ENTITY, (entity, name)));

        assertEq(state.getAnnotationRef(entity, "name"), keccak256(bytes(name)));
        vm.stopPrank();
    }

    function testNameUnownedEntity() public {
        // alice spawns a unit
        vm.startPrank(aliceAccount);
        sid++;
        bytes24 entity = Node.MobileUnit(sid);
        dispatcher.dispatch(abi.encodeCall(Actions.SPAWN_MOBILE_UNIT, (entity)));
        vm.stopPrank();

        // bob tries to name it
        vm.startPrank(bobAccount);
        vm.expectRevert("EntityNotOwnedByPlayer");
        dispatcher.dispatch(abi.encodeCall(Actions.NAME_OWNED_ENTITY, (entity, "bobsnow")));
        vm.stopPrank();
    }
}

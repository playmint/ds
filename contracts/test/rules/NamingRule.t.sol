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

contract NamingRuleTest is Test {
    event AnnotationSet(bytes24 id, AnnotationKind kind, string label, bytes32 ref, string data);

    Game internal game;
    Dispatcher internal dispatcher;
    State internal state;

    // accounts
    address aliceAccount;
    uint64 sid;

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
    }

    function testNameOwnedEntity() public {
        // spawn a unit
        vm.startPrank(aliceAccount);
        sid++;
        bytes24 entity = Node.Seeker(sid);
        dispatcher.dispatch(abi.encodeCall(Actions.SPAWN_SEEKER, (entity)));

        // rename the unit
        string memory name = "Jeff";
        dispatcher.dispatch(abi.encodeCall(Actions.NAME_OWNED_ENTITY, (entity, name)));

        assertEq(state.getAnnotationRef(entity, "name"), keccak256(bytes(name)));
    }
}

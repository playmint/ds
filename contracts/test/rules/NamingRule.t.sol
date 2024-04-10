// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "../helpers/GameTest.sol";
import "cog/BaseState.sol";

using Schema for State;

contract NamingRuleTest is Test, GameTest {
    event AnnotationSet(bytes24 id, AnnotationKind kind, string label, bytes32 ref, string data);

    uint64 sid;

    function testNameOwnedEntity() public {
        vm.startPrank(players[0].addr);
        sid++;
        bytes24 entity = Node.MobileUnit(players[0].addr);
        spawnMobileUnit();

        // rename the unit
        string memory name = "Jeff";
        setName(entity, name);

        BaseState base = BaseState(address(game.getState()));
        assertEq(base.getData(entity, "name"), bytes32(bytes(name)));
        vm.stopPrank();
    }

    function testNameUnownedEntity() public {
        vm.startPrank(players[0].addr);
        sid++;
        bytes24 entity = Node.MobileUnit(players[0].addr);
        spawnMobileUnit();
        vm.stopPrank();

        // another tries to rename it
        vm.startPrank(players[1].addr);
        vm.expectRevert("EntityNotOwnedByPlayer");
        setName(entity, "bobsnow");
        vm.stopPrank();
    }
}

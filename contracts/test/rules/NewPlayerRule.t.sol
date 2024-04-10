// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "../helpers/GameTest.sol";

using Schema for State;

contract NewPlayerRuleTest is Test, GameTest {
    function setUp() public {
        dev.spawnTile(0, 0, 0, 0);
    }

    function testAllowedPlayerCanSpawnMobileUnit() public {
        vm.startPrank(players[0].addr);
        spawnMobileUnit();
        vm.stopPrank();
    }
}

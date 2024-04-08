// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../helpers/GameTest.sol";
import "@ds/schema/Schema.sol";

using Schema for State;

uint32 constant TEST_MOBILE_UNIT_ID = 1;

contract ScoutRuleTest is Test, GameTest {
    function setUp() public {
        // force tile 0,0,0 DISCOVERED
        dev.spawnTile(0, 0, 0, 0);

        // place a mobileUnit at 0,0,0
        vm.startPrank(players[0].addr);
        spawnMobileUnit(TEST_MOBILE_UNIT_ID);
        vm.stopPrank();
    }

    function testScoutErrorAlreadyDiscovered() public {
        vm.startPrank(players[0].addr);
        vm.expectRevert("NoScoutAlreadyDiscovered");
        scoutMobileUnit(TEST_MOBILE_UNIT_ID, 0, 0, 0, 0); // expect fail as 0,0,0 already discovered in setUp
        vm.stopPrank();
    }

    function testScoutErrorNotOwner() public {
        vm.expectRevert("NoScoutNotOwner");
        scoutMobileUnit(TEST_MOBILE_UNIT_ID, 0, 0, 1, -1); // expect fail as no prank
    }

    function testScoutNotAdjacent() public {
        vm.startPrank(players[0].addr);
        vm.expectRevert("NoScoutUnadjacent");
        scoutMobileUnit(TEST_MOBILE_UNIT_ID, 0, 0, 2, -2); // expect fail as too far away from mobileUnit at 0,0,0
        vm.stopPrank();
    }

    function testScoutUndiscovered() public {
        int16 z = 0;
        int16 q = 0;
        int16 r = 1;
        int16 s = -1;

        // be alice
        vm.startPrank(players[0].addr);

        bytes24 targetTile = Node.Tile(z, q, r, s);

        assertEq(
            uint256(state.getBiome(targetTile)),
            uint256(BiomeKind.UNDISCOVERED),
            "expected target tile to be UNDISCOVERED to start"
        );

        // dispatch SCOUT_MOBILE_UNIT
        scoutMobileUnit(TEST_MOBILE_UNIT_ID, z, q, r, s);

        assertEq(
            uint256(state.getBiome(targetTile)),
            uint256(BiomeKind.DISCOVERED),
            "expected target tile to be DISCOVERED after scout"
        );

        // stop being alice
        vm.stopPrank();
    }
}

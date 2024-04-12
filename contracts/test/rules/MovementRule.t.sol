// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "../helpers/GameTest.sol";

using Schema for State;

contract MovementRuleTest is Test, GameTest {
    function setUp() public {
        // discover a star shape of tiles 6-axis from center
        for (int16 i = 0; i < 3; i++) {
            dev.spawnTile(0, 0, -i, i);
            dev.spawnTile(0, 0, i, -i);
            dev.spawnTile(0, i, 0, -i);
            dev.spawnTile(0, -i, 0, i);
            dev.spawnTile(0, -i, i, 0);
            dev.spawnTile(0, i, -i, 0);
        }

        // place a mobileUnit at 0,0,0
        vm.startPrank(players[0].addr);
        spawnMobileUnit();
        vm.stopPrank();
    }

    function testMoveSE() public {
        _testMoveTo(0, 0, 1, -1);
    }

    function testMoveNW() public {
        _testMoveTo(0, 0, -1, 1);
    }

    function testMoveE() public {
        _testMoveTo(0, 1, 0, -1);
    }

    function testMoveW() public {
        _testMoveTo(0, -1, 0, 1);
    }

    function testMoveNE() public {
        _testMoveTo(0, 1, -1, 0);
    }

    function testMoveSW() public {
        _testMoveTo(0, -1, 1, 0);
    }

    // function testMoveWhenMoving() public {
    //     // be alice
    //     vm.startPrank(players[0].addr);
    //     bytes24 mobileUnit = Node.MobileUnit(players[0].addr);
    //     // move 2 tiles away
    //     moveMobileUnit(0, 2, -2);
    //     // assuming speed is 1 tile per block
    //     // if we move 1 block forward we should be at (0,1,-1)
    //     // TODO: this test will break if TRAVEL_SPEED changes, fix it!
    //     vm.roll(block.number + 1);
    //     assertEq(
    //         state.getCurrentLocation(mobileUnit, uint64(block.number)),
    //         Node.Tile(DEFAULT_ZONE, 0, 1, -1),
    //         "expected current location to be 0,1,-1 as we are halfway"
    //     );
    //     // try to move away from current location...
    //     // _discover(-1,1,0);
    //     moveMobileUnit(-1, 1, 0);
    //     assertEq(
    //         state.getPrevLocation(mobileUnit), Node.Tile(DEFAULT_ZONE, 0, 1, -1), "expected prev location to now be 0,1,-1"
    //     );
    //     assertEq(
    //         state.getCurrentLocation(mobileUnit, uint64(block.number)),
    //         Node.Tile(DEFAULT_ZONE, 0, 1, -1),
    //         "expected current location to still be 0,1,-1 after new move issued"
    //     );
    //     assertEq(
    //         state.getNextLocation(mobileUnit),
    //         Node.Tile(DEFAULT_ZONE, -1, 1, 0),
    //         "expected next location to be -1,1,0 after new move issued"
    //     );
    //     // move time forward
    //     (, uint64 arrivalTime) = state.get(Rel.Location.selector, uint8(LocationKey.NEXT), mobileUnit);
    //     vm.roll(arrivalTime); // let time pass
    //     // we should now have arrived at -1,2,1
    //     assertEq(
    //         state.getCurrentLocation(mobileUnit, uint64(block.number)),
    //         Node.Tile(DEFAULT_ZONE, -1, 1, 0),
    //         "expected arrive at -1,1,0"
    //     );
    //     // stop being alice
    //     vm.stopPrank();
    // }

    function testNoMoveNotOwner() public {
        vm.expectRevert("NoMoveNotOwner");
        moveMobileUnit(0, 0, 1, 1); // should fail without prank
            // dispatcher.dispatch(
            //     abi.encodeCall(
            //         Actions.MOVE_MOBILE_UNIT,
            //         ( 0, 1, -1 )
            //     )
            // );
    }

    function testNoMoveToUndiscovered() public {
        vm.startPrank(players[0].addr);
        vm.expectRevert("NoMoveToUndiscovered");
        moveMobileUnit(0, 0, 5, -5);
        vm.stopPrank();
    }

    // function testNoMoveIndirect() public {
    //     vm.startPrank(players[0].addr);
    //     moveMobileUnit(0, -2, 2);
    //     vm.roll(block.number + 100); // resolve the move
    //     vm.expectRevert("NoMoveToIndirect");
    //     moveMobileUnit(1, -1, 0);
    //     vm.stopPrank();
    // }

    function _testMoveTo(int16 z, int16 q, int16 r, int16 s) private {
        // dispatch as alice
        vm.startPrank(players[0].addr);
        moveMobileUnit(z, q, r, s);

        bytes24 mobileUnit = Node.MobileUnit(players[0].addr);

        assertEq(
            state.getNextLocation(mobileUnit),
            Node.Tile(z, q, r, s),
            "expected mobileUnit next location to be correctly set"
        );

        // ENABLE THIS ONCE WE ENABLE TRAVEL TIME
        // assertEq(
        //     state.getCurrentLocation(mobileUnit, uint64(block.number)),
        //     Node.Tile(DEFAULT_ZONE, 0, 0, 0),
        //     "expected current location to still be 0,0,0 as no time passed"
        // );

        (, uint64 arrivalTime) = state.get(Rel.Location.selector, uint8(LocationKey.NEXT), mobileUnit);
        vm.roll(arrivalTime); // let time pass

        assertEq(
            state.getCurrentLocation(mobileUnit, uint64(block.number)),
            Node.Tile(z, q, r, s),
            "expected current location to now be same as next location"
        );
        // stop being alice
        vm.stopPrank();
    }
}

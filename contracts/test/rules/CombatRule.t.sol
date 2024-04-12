// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "../helpers/GameTest.sol";
import "@ds/rules/CombatRule.sol";

using Schema for State;

contract CombatRuleTest is Test, GameTest {
    event AnnotationSet(bytes24 id, AnnotationKind kind, string label, bytes32 ref, string data);

    bytes24[4] defaultMaterialItem;
    uint64[4] defaultMaterialQty;

    bytes24 mobileUnit0;
    bytes24 mobileUnit1;
    bytes24 mobileUnit2;

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

        // place mobileUnits (maybe using separate accounts was overkill...)

        vm.startPrank(players[0].addr);
        mobileUnit0 = _spawnMobileUnit(players[0].addr, 0, 0, 0, 0);
        vm.stopPrank();

        vm.startPrank(players[1].addr);
        mobileUnit1 = _spawnMobileUnit(players[1].addr, 0, 1, 0, -1);
        vm.stopPrank();

        vm.startPrank(players[2].addr);
        mobileUnit2 = _spawnMobileUnit(players[2].addr, 0, 0, 1, -1);
        vm.stopPrank();

        // setup default material construction costs
        defaultMaterialItem[0] = ItemUtils.GreenGoo();
        defaultMaterialItem[1] = ItemUtils.BlueGoo();
        defaultMaterialItem[2] = ItemUtils.RedGoo();
        defaultMaterialQty[0] = 25;
        defaultMaterialQty[1] = 25;
        defaultMaterialQty[2] = 25;
    }

    function testStartCombat() public {
        bytes24 targetTileID = Node.Tile(0, 1, 0, -1);
        bytes24[] memory attackers = new bytes24[](1);
        attackers[0] = mobileUnit0;

        bytes24[] memory defenders = new bytes24[](1);
        defenders[0] = mobileUnit1;

        vm.recordLogs();

        vm.startPrank(players[0].addr);
        dispatcher.dispatch(abi.encodeCall(Actions.START_COMBAT, (mobileUnit0, targetTileID, attackers, defenders)));
        vm.stopPrank();

        // Check that the session exists, points to tiles and is pointing to mobileUnit0 and mobileUnit1
    }

    function testDuplicateSessions() public {
        bytes24 targetTileID = Node.Tile(0, 1, 0, -1);
        bytes24[] memory attackers = new bytes24[](1);
        attackers[0] = mobileUnit0;

        bytes24[] memory defenders = new bytes24[](1);
        defenders[0] = mobileUnit1;

        vm.recordLogs();

        vm.startPrank(players[0].addr);
        dispatcher.dispatch(abi.encodeCall(Actions.START_COMBAT, (mobileUnit0, targetTileID, attackers, defenders)));

        vm.expectRevert("CombatSessionAlreadyActive");

        dispatcher.dispatch(abi.encodeCall(Actions.START_COMBAT, (mobileUnit0, targetTileID, attackers, defenders)));

        // Should be allowed to start a combat session after a finished session has been finalised
        vm.roll(block.number + COMBAT_JOIN_WINDOW_BLOCKS);
        dispatcher.dispatch(abi.encodeCall(Actions.FINALISE_COMBAT, (Node.CombatSession(1))));

        dispatcher.dispatch(abi.encodeCall(Actions.START_COMBAT, (mobileUnit0, targetTileID, attackers, defenders)));

        vm.stopPrank();
    }

    // function testJoiningAndLeaving() public {
    //     bytes24 targetTileID = Node.Tile(0, 1, 0, -1);
    //     bytes24[] memory attackers = new bytes24[](1);
    //     attackers[0] = mobileUnit0;

    //     bytes24[] memory defenders = new bytes24[](1);
    //     defenders[0] = mobileUnit1;

    //     vm.recordLogs();

    //     vm.startPrank(players[0].addr);
    //     dispatcher.dispatch(abi.encodeCall(Actions.START_COMBAT, (mobileUnit0, targetTileID, attackers, defenders)));
    //     vm.stopPrank();

    //     vm.startPrank(players[2].addr);
    //     dispatcher.dispatch(abi.encodeCall(Actions.MOVE_MOBILE_UNIT, (state.getSid(mobileUnit2), 0, 0, 0)));
    //     vm.roll(block.number + 10);
    //     dispatcher.dispatch(abi.encodeCall(Actions.MOVE_MOBILE_UNIT, (state.getSid(mobileUnit2), 0, 1, -1)));
    //     vm.stopPrank();

    //     // Gather session update events
    //     CombatAction[][] memory sessionUpdates = _getSessionUpdates();
    //     uint32[] memory sortedListIndexes = getOrderedListIndexes(sessionUpdates);
    //     dispatcher.dispatch(
    //         abi.encodeCall(Actions.FINALISE_COMBAT, (Node.CombatSession(1), sessionUpdates, sortedListIndexes))
    //     );
    // }

    function testStartCombatAgainstBuilding() public {
        bytes24 targetTileID = Node.Tile(0, 1, -1, 0);
        bytes24[] memory attackers = new bytes24[](1);
        attackers[0] = mobileUnit0;
        // attackers[1] = mobileUnit2;

        bytes24[] memory defenders = new bytes24[](1);
        defenders[0] = _constructBuilding();

        vm.recordLogs();

        vm.startPrank(players[0].addr);
        dispatcher.dispatch(abi.encodeCall(Actions.START_COMBAT, (mobileUnit0, targetTileID, attackers, defenders)));
        vm.stopPrank();

        // Fast forward to end of join window and finalise
        vm.roll(block.number + COMBAT_JOIN_WINDOW_BLOCKS);
        dispatcher.dispatch(abi.encodeCall(Actions.FINALISE_COMBAT, (Node.CombatSession(1))));
    }

    function _constructBuilding() private returns (bytes24) {
        // register a building kind
        bytes24 buildingKind = Node.BuildingKind(20);
        string memory buildingName = "hut";
        bytes24[4] memory inputItemIDs;
        uint64[4] memory inputQtys;
        dispatcher.dispatch(
            abi.encodeCall(
                Actions.REGISTER_BUILDING_KIND,
                (
                    buildingKind,
                    buildingName,
                    BuildingCategory.NONE,
                    "",
                    defaultMaterialItem,
                    defaultMaterialQty,
                    inputItemIDs,
                    inputQtys,
                    [bytes24(0)],
                    [uint64(0)]
                )
            )
        );
        // spawn a mobileUnit
        vm.startPrank(players[3].addr);
        bytes24 mobileUnit = _spawnMobileUnitWithResources(players[3].addr);
        // discover an adjacent tile for our building site
        (int16 z, int16 q, int16 r, int16 s) = (0, 1, -1, 0);
        dev.spawnTile(z, q, r, s);
        // get our building and give it the resources to construct
        bytes24 buildingInstance = Node.Building(z, q, r, s);
        // construct our building
        _transferFromMobileUnit(mobileUnit, 0, 25, buildingInstance);
        _transferFromMobileUnit(mobileUnit, 1, 25, buildingInstance);
        _transferFromMobileUnit(mobileUnit, 2, 25, buildingInstance);
        dispatcher.dispatch(abi.encodeCall(Actions.CONSTRUCT_BUILDING_MOBILE_UNIT, (buildingKind, z, q, r, s)));
        vm.stopPrank();
        // check the building has a location at q/r/s
        assertEq(state.getFixedLocation(buildingInstance), Node.Tile(z, q, r, s), "expected building to have location");
        // check building has owner
        assertEq(
            state.getOwner(buildingInstance), Node.Player(players[3].addr), "expected building to be owned by alice"
        );
        // check building has kind
        assertEq(state.getBuildingKind(buildingInstance), buildingKind, "expected building to have kind");
        // check building has a bag equip
        assertTrue(state.getEquipSlot(buildingInstance, 0) != 0x0, "expected building to have a bag equip");

        return buildingInstance;
    }

    // _spawnMobileUnitWithResources spawns a mobileUnit for the current sender at
    // 0,0,0 with 100 of each resource in an equiped bag
    function _spawnMobileUnitWithResources(address player) private returns (bytes24) {
        dev.spawnTile(0, 0, 0, 0);
        bytes24 mobileUnit = Node.MobileUnit(player);
        spawnMobileUnit();
        dev.spawnFullBag(state.getOwnerAddress(mobileUnit), mobileUnit, 0);

        return mobileUnit;
    }

    function _spawnMobileUnit(address player, int16 z, int16 q, int16 r, int16 s) private returns (bytes24) {
        spawnMobileUnit();
        moveMobileUnit(z, q, r, s);
        vm.roll(block.number + 100);
        return Node.MobileUnit(player);
    }

    function _transferFromMobileUnit(bytes24 mobileUnit, uint8 slot, uint64 qty, bytes24 toBuilding) private {
        bytes24 buildingBag = Node.Bag(uint64(uint256(keccak256(abi.encode(toBuilding)))));
        dispatcher.dispatch(
            abi.encodeCall(
                Actions.TRANSFER_ITEM_MOBILE_UNIT,
                (mobileUnit, [mobileUnit, toBuilding], [0, 0], [slot, slot], buildingBag, qty)
            )
        );
    }
}

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "forge-std/console.sol";

import {State, AnnotationKind} from "cog/State.sol";
import {Dispatcher} from "cog/Dispatcher.sol";

import {Game} from "@ds/Game.sol";
import {Actions, BiomeKind, CombatAction, CombatActionKind} from "@ds/actions/Actions.sol";
import {Schema, Node, Rel, LocationKey, DEFAULT_ZONE, GOO_GREEN, GOO_BLUE, GOO_RED} from "@ds/schema/Schema.sol";
import {ItemUtils} from "@ds/utils/ItemUtils.sol";
import {CombatRule, JoinActionInfo, HASH_EDGE_INDEX} from "@ds/rules/CombatRule.sol";

using Schema for State;

contract CombatRuleTest is Test {
    event AnnotationSet(bytes24 id, AnnotationKind kind, string label, bytes32 ref, string data);

    Game internal game;
    Dispatcher internal dispatcher;
    State internal state;

    bytes24[4] defaultMaterialItem;
    uint64[4] defaultMaterialQty;

    // accounts
    address aliceAccount;
    address bobAccount;
    address thirdAccount;
    address buildingOwnerAccount;

    // mobileUnits
    uint32 sid;

    bytes24 aliceMobileUnitID;
    bytes24 bobMobileUnitID;
    bytes24 thirdMobileUnitID;
    bytes24 buildingOwnerMobileUnitID;

    function setUp() public {
        // setup users
        uint256 alicePrivateKey = 0xA11CE;
        aliceAccount = vm.addr(alicePrivateKey);
        uint256 bobPrivateKey = 0xB0B;
        bobAccount = vm.addr(bobPrivateKey);
        uint256 thirdPrivateKey = 0x3;
        thirdAccount = vm.addr(thirdPrivateKey);
        uint256 buildingOwnerPrivateKey = 0x4;
        buildingOwnerAccount = vm.addr(buildingOwnerPrivateKey);

        // setup allowlist
        address[] memory allowlist = new address[](4);
        allowlist[0] = aliceAccount;
        allowlist[1] = bobAccount;
        allowlist[2] = thirdAccount;
        allowlist[3] = buildingOwnerAccount;

        // setup game
        game = new Game(allowlist);
        dispatcher = game.getDispatcher();

        // fetch the State to play with
        state = game.getState();

        // discover a star shape of tiles 6-axis from center
        for (int16 i = 0; i < 3; i++) {
            _discover(0, -i, i);
            _discover(0, i, -i);
            _discover(i, 0, -i);
            _discover(-i, 0, i);
            _discover(-i, i, 0);
            _discover(i, -i, 0);
        }

        // place mobileUnits (maybe using separate accounts was overkill...)

        vm.startPrank(aliceAccount);
        aliceMobileUnitID = _spawnMobileUnit(++sid, 0, 0, 0);
        vm.stopPrank();

        vm.startPrank(bobAccount);
        bobMobileUnitID = _spawnMobileUnit(++sid, 1, 0, -1);
        vm.stopPrank();

        vm.startPrank(thirdAccount);
        thirdMobileUnitID = _spawnMobileUnit(++sid, 0, 1, -1);
        vm.stopPrank();

        // setup default material construction costs
        defaultMaterialItem[0] = ItemUtils.GlassGreenGoo();
        defaultMaterialItem[1] = ItemUtils.BeakerBlueGoo();
        defaultMaterialItem[2] = ItemUtils.FlaskRedGoo();
        defaultMaterialQty[0] = 25;
        defaultMaterialQty[1] = 25;
        defaultMaterialQty[2] = 25;
    }

    function _discover(int16 q, int16 r, int16 s) private {
        dispatcher.dispatch(
            abi.encodeCall(
                Actions.DEV_SPAWN_TILE,
                (
                    BiomeKind.DISCOVERED,
                    q, // q
                    r, // r
                    s // s
                )
            )
        );
    }

    function testStartCombat() public {
        bytes24 targetTileID = Node.Tile(0, 1, 0, -1);
        bytes24[] memory attackers = new bytes24[](1);
        attackers[0] = aliceMobileUnitID;

        bytes24[] memory defenders = new bytes24[](1);
        defenders[0] = bobMobileUnitID;

        vm.recordLogs();

        vm.startPrank(aliceAccount);
        dispatcher.dispatch(
            abi.encodeCall(Actions.START_COMBAT, (aliceMobileUnitID, targetTileID, attackers, defenders))
        );
        vm.stopPrank();

        Vm.Log[] memory entries = vm.getRecordedLogs();
        Vm.Log[] memory sessionUpdates = new Vm.Log[](entries.length);

        uint256 sessionUpdatesLength;
        for (uint256 i = 0; i < entries.length; i++) {
            if (entries[i].topics[0] == keccak256("SessionUpdate(uint64,bytes)")) {
                sessionUpdates[sessionUpdatesLength] = entries[i];
                sessionUpdatesLength++;
            }
        }

        assertGt(sessionUpdatesLength, 0, "no combat logs found");

        // NOTE: The first two uint256 I think are the two unused topics of the event.
        //       Also this doesn't work quite like the example at https://book.getfoundry.sh/cheatcodes/get-recorded-logs
        //       In the example data on the log is the data bytes unlike what we have here where it includes the unindexed topics
        ( /* uint256 */ , /* uint256 */, bytes memory data) =
            abi.decode(sessionUpdates[0].data, (uint256, uint256, bytes));

        (CombatAction[] memory actions) = abi.decode(data, (CombatAction[]));
        assertEq(actions.length, 2, "combat action list expected to have 2 entries for the two mobileUnits");
        assertEq(uint8(actions[0].kind), uint8(CombatActionKind.JOIN));
        assertEq(uint8(actions[1].kind), uint8(CombatActionKind.JOIN));

        {
            // Check that the hashes match. Every combat list update is hashed against the last
            bytes20 combatActionsHash;
            for (uint256 i = 0; i < sessionUpdatesLength; i++) {
                ( /* uint256 */ , /* uint256 */, bytes memory listUpdate) =
                    abi.decode(sessionUpdates[i].data, (uint256, uint256, bytes));

                combatActionsHash = bytes20(keccak256(abi.encodePacked(combatActionsHash, listUpdate)));
            }

            bytes20 storedHash = state.getHash(bytes24(Node.CombatSession(1)), HASH_EDGE_INDEX);
            assertGt(uint160(storedHash), 0, "Stored hash is null");
            assertEq(storedHash, combatActionsHash, "Hashes do not match");
        }
    }

    function testDuplicateSessions() public {
        bytes24 targetTileID = Node.Tile(0, 1, 0, -1);
        bytes24[] memory attackers = new bytes24[](1);
        attackers[0] = aliceMobileUnitID;

        bytes24[] memory defenders = new bytes24[](1);
        defenders[0] = bobMobileUnitID;

        vm.recordLogs();

        vm.startPrank(aliceAccount);
        dispatcher.dispatch(
            abi.encodeCall(Actions.START_COMBAT, (aliceMobileUnitID, targetTileID, attackers, defenders))
        );

        vm.expectRevert("CombatSessionAlreadyActive");

        dispatcher.dispatch(
            abi.encodeCall(Actions.START_COMBAT, (aliceMobileUnitID, targetTileID, attackers, defenders))
        );

        // Should be allowed to start a combat session after a finished session has been finalised
        vm.roll(block.number + 100);
        CombatAction[][] memory sessionUpdates = _getSessionUpdates();

        // We need to process the actions in blockNum order however we can't pass them in ordered because
        // Hashes wouldn't compute the same. Ordering the list client side could be a problem as it's something
        // that could be tampered with.
        uint32[] memory sortedListIndexes = getOrderedListIndexes(sessionUpdates);

        dispatcher.dispatch(
            abi.encodeCall(Actions.FINALISE_COMBAT, (Node.CombatSession(1), sessionUpdates, sortedListIndexes))
        );

        dispatcher.dispatch(
            abi.encodeCall(Actions.START_COMBAT, (aliceMobileUnitID, targetTileID, attackers, defenders))
        );

        vm.stopPrank();
    }

    function testJoiningAndLeaving() public {
        bytes24 targetTileID = Node.Tile(0, 1, 0, -1);
        bytes24[] memory attackers = new bytes24[](1);
        attackers[0] = aliceMobileUnitID;

        bytes24[] memory defenders = new bytes24[](1);
        defenders[0] = bobMobileUnitID;

        vm.recordLogs();

        vm.startPrank(aliceAccount);
        dispatcher.dispatch(
            abi.encodeCall(Actions.START_COMBAT, (aliceMobileUnitID, targetTileID, attackers, defenders))
        );
        vm.stopPrank();

        vm.startPrank(thirdAccount);
        dispatcher.dispatch(abi.encodeCall(Actions.MOVE_MOBILE_UNIT, (state.getSid(thirdMobileUnitID), 0, 0, 0)));
        vm.roll(block.number + 10);
        dispatcher.dispatch(abi.encodeCall(Actions.MOVE_MOBILE_UNIT, (state.getSid(thirdMobileUnitID), 0, 1, -1)));
        vm.stopPrank();

        // Gather session update events
        CombatAction[][] memory sessionUpdates = _getSessionUpdates();
        uint32[] memory sortedListIndexes = getOrderedListIndexes(sessionUpdates);
        dispatcher.dispatch(
            abi.encodeCall(Actions.FINALISE_COMBAT, (Node.CombatSession(1), sessionUpdates, sortedListIndexes))
        );
    }

    function testStartCombatAgainstBuilding() public {
        bytes24 targetTileID = Node.Tile(0, 1, -1, 0);
        bytes24[] memory attackers = new bytes24[](1);
        attackers[0] = aliceMobileUnitID;
        // attackers[1] = thirdMobileUnitID;

        bytes24[] memory defenders = new bytes24[](1);
        defenders[0] = _constructBuilding();

        vm.recordLogs();

        vm.startPrank(aliceAccount);
        dispatcher.dispatch(
            abi.encodeCall(Actions.START_COMBAT, (aliceMobileUnitID, targetTileID, attackers, defenders))
        );
        vm.stopPrank();

        // Fast forward to end of battle and finalise
        vm.roll(block.number + 100);
        CombatAction[][] memory sessionUpdates = _getSessionUpdates();
        uint32[] memory sortedListIndexes = getOrderedListIndexes(sessionUpdates);
        dispatcher.dispatch(
            abi.encodeCall(Actions.FINALISE_COMBAT, (Node.CombatSession(1), sessionUpdates, sortedListIndexes))
        );
    }

    function _getSessionUpdates() private returns (CombatAction[][] memory) {
        return _getSessionUpdates(new CombatAction[][](0));
    }

    function _getSessionUpdates(CombatAction[][] memory prevSessionUpdates) private returns (CombatAction[][] memory) {
        // Gather session update events
        Vm.Log[] memory entries = vm.getRecordedLogs();
        Vm.Log[] memory sessionUpdateEvents = new Vm.Log[](entries.length);

        // Filter by SessionUpdate
        uint256 sessionUpdatesLength;
        for (uint256 i = 0; i < entries.length; i++) {
            if (entries[i].topics[0] == keccak256("SessionUpdate(uint64,bytes)")) {
                sessionUpdateEvents[sessionUpdatesLength] = entries[i];
                sessionUpdatesLength++;
            }
        }

        // Copy over previous events
        CombatAction[][] memory sessionUpdates = new CombatAction[][](sessionUpdatesLength + prevSessionUpdates.length);
        for (uint256 i = 0; i < prevSessionUpdates.length; i++) {
            sessionUpdates[i] = prevSessionUpdates[i];
        }

        // Decode new events
        for (uint256 i = 0; i < sessionUpdatesLength; i++) {
            ( /* uint256 */ , /* uint256 */, bytes memory combatActionsEncoded) =
                abi.decode(sessionUpdateEvents[i].data, (uint256, uint256, bytes));
            // _logActionList(combatActionsEncoded);
            (sessionUpdates[i + prevSessionUpdates.length]) = abi.decode(combatActionsEncoded, (CombatAction[]));
        }

        return sessionUpdates;
    }

    function _logActionList(bytes memory encodedActions) private view {
        (CombatAction[] memory combatActions) = abi.decode(encodedActions, (CombatAction[]));
        for (uint256 i = 0; i < combatActions.length; i++) {
            console.log("actionKind: ", uint8(combatActions[i].kind));
            console.log("entityID: ", uint192(combatActions[i].entityID));
            console.log("blockNum: ", combatActions[i].blockNum);
            if (combatActions[i].kind == CombatActionKind.JOIN) {
                (JoinActionInfo memory info) = abi.decode(combatActions[i].data, (JoinActionInfo));
                console.log("combatSide: ", uint8(info.combatSide));
                console.log("LIFE: ", info.stats[GOO_GREEN]);
                console.log("ATK: ", info.stats[GOO_RED]);
                console.log("DEF: ", info.stats[GOO_BLUE]);
            }
        }
    }

    struct CombatActionIndex {
        uint64 blockNum;
        uint16 i;
        uint16 j;
    }

    function getOrderedListIndexes(CombatAction[][] memory sessionUpdates) private pure returns (uint32[] memory) {
        uint256 totalLength = 0;

        for (uint256 i = 0; i < sessionUpdates.length; i++) {
            totalLength += sessionUpdates[i].length;
        }

        CombatActionIndex[] memory flattenedIndexes = new CombatActionIndex[](totalLength);
        uint256 currentIndex = 0;

        for (uint256 i = 0; i < sessionUpdates.length; i++) {
            for (uint256 j = 0; j < sessionUpdates[i].length; j++) {
                flattenedIndexes[currentIndex] = CombatActionIndex(sessionUpdates[i][j].blockNum, uint16(i), uint16(j));
                currentIndex++;
            }
        }

        for (uint256 i = 0; i < flattenedIndexes.length - 1; i++) {
            for (uint256 j = i + 1; j < flattenedIndexes.length; j++) {
                if (flattenedIndexes[i].blockNum > flattenedIndexes[j].blockNum) {
                    CombatActionIndex memory temp = flattenedIndexes[i];
                    flattenedIndexes[i] = flattenedIndexes[j];
                    flattenedIndexes[j] = temp;
                }
            }
        }

        uint32[] memory indexes = new uint32[](flattenedIndexes.length);
        for (uint256 i = 0; i < flattenedIndexes.length; i++) {
            indexes[i] = flattenedIndexes[i].i | (uint32(flattenedIndexes[i].j) << 16);
        }

        return indexes;
    }

    function _constructBuilding() private returns (bytes24) {
        // register a building kind
        bytes24 buildingKind = Node.BuildingKind(20);
        string memory buildingName = "hut";
        vm.expectEmit(true, true, true, true, address(state));
        emit AnnotationSet(buildingKind, AnnotationKind.CALLDATA, "name", keccak256(bytes(buildingName)), buildingName);
        dispatcher.dispatch(
            abi.encodeCall(
                Actions.REGISTER_BUILDING_KIND, (buildingKind, "hut", defaultMaterialItem, defaultMaterialQty)
            )
        );
        // spawn a mobileUnit
        vm.startPrank(buildingOwnerAccount);
        bytes24 mobileUnit = _spawnMobileUnitWithResources();
        // discover an adjacent tile for our building site
        (int16 q, int16 r, int16 s) = (1, -1, 0);
        _discover(q, r, s);
        // get our building and give it the resources to construct
        bytes24 buildingInstance = Node.Building(DEFAULT_ZONE, q, r, s);
        // construct our building
        _transferFromMobileUnit(mobileUnit, 0, 25, buildingInstance);
        _transferFromMobileUnit(mobileUnit, 1, 25, buildingInstance);
        _transferFromMobileUnit(mobileUnit, 2, 25, buildingInstance);
        dispatcher.dispatch(abi.encodeCall(Actions.CONSTRUCT_BUILDING_MOBILE_UNIT, (mobileUnit, buildingKind, q, r, s)));
        vm.stopPrank();
        // check the building has a location at q/r/s
        assertEq(
            state.getFixedLocation(buildingInstance),
            Node.Tile(DEFAULT_ZONE, q, r, s),
            "expected building to have location"
        );
        // check building has owner
        assertEq(
            state.getOwner(buildingInstance),
            Node.Player(buildingOwnerAccount),
            "expected building to be owned by alice"
        );
        // check building has kind
        assertEq(state.getBuildingKind(buildingInstance), buildingKind, "expected building to have kind");
        // check building has a bag equip
        assertTrue(state.getEquipSlot(buildingInstance, 0) != 0x0, "expected building to have a bag equip");

        return buildingInstance;
    }

    // _spawnMobileUnitWithResources spawns a mobileUnit for the current sender at
    // 0,0,0 with 100 of each resource in an equiped bag
    function _spawnMobileUnitWithResources() private returns (bytes24) {
        sid++;
        bytes24 mobileUnit = Node.MobileUnit(sid);
        _discover(0, 0, 0);
        dispatcher.dispatch(abi.encodeCall(Actions.SPAWN_MOBILE_UNIT, (mobileUnit)));
        bytes24[] memory items = new bytes24[](3);
        items[0] = ItemUtils.GlassGreenGoo();
        items[1] = ItemUtils.BeakerBlueGoo();
        items[2] = ItemUtils.FlaskRedGoo();

        uint64[] memory balances = new uint64[](3);
        balances[0] = 100;
        balances[1] = 100;
        balances[2] = 100;

        uint64 mobileUnitBag = uint64(uint256(keccak256(abi.encode(mobileUnit))));
        dispatcher.dispatch(
            abi.encodeCall(
                Actions.DEV_SPAWN_BAG,
                (mobileUnitBag, state.getOwnerAddress(mobileUnit), mobileUnit, 0, items, balances)
            )
        );

        return mobileUnit;
    }

    function _spawnMobileUnit(uint32 mobileUnitID, int16 q, int16 r, int16 s) private returns (bytes24) {
        dispatcher.dispatch(abi.encodeCall(Actions.SPAWN_MOBILE_UNIT, (Node.MobileUnit(mobileUnitID))));
        dispatcher.dispatch(abi.encodeCall(Actions.MOVE_MOBILE_UNIT, (sid, q, r, s)));
        vm.roll(block.number + 100);
        return Node.MobileUnit(sid);
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

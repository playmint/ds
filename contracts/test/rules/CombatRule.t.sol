// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "forge-std/console.sol";

import {State, AnnotationKind} from "cog/State.sol";
import {Dispatcher} from "cog/Dispatcher.sol";

import {Game} from "@ds/Game.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {
    Schema,
    Node,
    Rel,
    LocationKey,
    BiomeKind,
    DEFAULT_ZONE,
    ATOM_LIFE,
    ATOM_DEFENSE,
    ATOM_ATTACK
} from "@ds/schema/Schema.sol";
import {CombatRule, HASH_EDGE_INDEX} from "@ds/rules/CombatRule.sol";
import {ItemUtils} from "@ds/utils/ItemUtils.sol";

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

    // seekers
    uint32 sid;

    bytes24 aliceSeekerID;
    bytes24 bobSeekerID;
    bytes24 thirdSeekerID;
    bytes24 buildingOwnerSeekerID;

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

        // place seekers (maybe using separate accounts was overkill...)

        vm.startPrank(aliceAccount);
        aliceSeekerID = _spawnSeeker(++sid, 0, 0, 0);
        vm.stopPrank();

        vm.startPrank(bobAccount);
        bobSeekerID = _spawnSeeker(++sid, 1, 0, -1);
        vm.stopPrank();

        vm.startPrank(thirdAccount);
        thirdSeekerID = _spawnSeeker(++sid, 0, 1, -1);
        vm.stopPrank();

        // setup default material construction costs
        defaultMaterialItem[0] = ItemUtils.Kiki();
        defaultMaterialItem[1] = ItemUtils.Bouba();
        defaultMaterialItem[2] = ItemUtils.Semiote();
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
        attackers[0] = aliceSeekerID;

        bytes24[] memory defenders = new bytes24[](1);
        defenders[0] = bobSeekerID;

        vm.recordLogs();

        vm.startPrank(aliceAccount);
        dispatcher.dispatch(abi.encodeCall(Actions.START_COMBAT, (aliceSeekerID, targetTileID, attackers, defenders)));
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

        (CombatRule.CombatAction[] memory actions) = abi.decode(data, (CombatRule.CombatAction[]));
        assertEq(actions.length, 2, "combat action list expected to have 2 entries for the two seekers");
        assertEq(uint8(actions[0].kind), uint8(CombatRule.CombatActionKind.JOIN));
        assertEq(uint8(actions[1].kind), uint8(CombatRule.CombatActionKind.JOIN));

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
        attackers[0] = aliceSeekerID;

        bytes24[] memory defenders = new bytes24[](1);
        defenders[0] = bobSeekerID;

        vm.recordLogs();

        vm.startPrank(aliceAccount);
        dispatcher.dispatch(abi.encodeCall(Actions.START_COMBAT, (aliceSeekerID, targetTileID, attackers, defenders)));

        vm.expectRevert("CombatSessionAlreadyActive");

        dispatcher.dispatch(abi.encodeCall(Actions.START_COMBAT, (aliceSeekerID, targetTileID, attackers, defenders)));

        // Should be allowed to start a combat session after a finished session has been finalised
        vm.roll(block.number + 100);
        CombatRule.CombatAction[][] memory sessionUpdates = _getSessionUpdates();

        // We need to process the actions in blockNum order however we can't pass them in ordered because
        // Hashes wouldn't compute the same. Ordering the list client side could be a problem as it's something
        // that could be tampered with.
        uint32[] memory sortedListIndexes = getOrderedListIndexes(sessionUpdates);

        dispatcher.dispatch(
            abi.encodeCall(Actions.FINALISE_COMBAT, (Node.CombatSession(1), sessionUpdates, sortedListIndexes))
        );

        dispatcher.dispatch(abi.encodeCall(Actions.START_COMBAT, (aliceSeekerID, targetTileID, attackers, defenders)));

        vm.stopPrank();
    }

    function testJoiningAndLeaving() public {
        bytes24 targetTileID = Node.Tile(0, 1, 0, -1);
        bytes24[] memory attackers = new bytes24[](1);
        attackers[0] = aliceSeekerID;

        bytes24[] memory defenders = new bytes24[](1);
        defenders[0] = bobSeekerID;

        vm.recordLogs();

        vm.startPrank(aliceAccount);
        dispatcher.dispatch(abi.encodeCall(Actions.START_COMBAT, (aliceSeekerID, targetTileID, attackers, defenders)));
        vm.stopPrank();

        vm.startPrank(thirdAccount);
        dispatcher.dispatch(abi.encodeCall(Actions.MOVE_SEEKER, (state.getSid(thirdSeekerID), 0, 0, 0)));
        vm.roll(block.number + 10);
        dispatcher.dispatch(abi.encodeCall(Actions.MOVE_SEEKER, (state.getSid(thirdSeekerID), 0, 1, -1)));
        vm.stopPrank();

        // Gather session update events
        CombatRule.CombatAction[][] memory sessionUpdates = _getSessionUpdates();
        uint32[] memory sortedListIndexes = getOrderedListIndexes(sessionUpdates);
        dispatcher.dispatch(
            abi.encodeCall(Actions.FINALISE_COMBAT, (Node.CombatSession(1), sessionUpdates, sortedListIndexes))
        );
    }

    function testStartCombatAgainstBuilding() public {
        bytes24 targetTileID = Node.Tile(0, 1, -1, 0);
        bytes24[] memory attackers = new bytes24[](1);
        attackers[0] = aliceSeekerID;
        // attackers[1] = thirdSeekerID;

        bytes24[] memory defenders = new bytes24[](1);
        defenders[0] = _constructBuilding();

        vm.recordLogs();

        vm.startPrank(aliceAccount);
        dispatcher.dispatch(abi.encodeCall(Actions.START_COMBAT, (aliceSeekerID, targetTileID, attackers, defenders)));
        vm.stopPrank();

        // Fast forward to end of battle and finalise
        vm.roll(block.number + 100);
        CombatRule.CombatAction[][] memory sessionUpdates = _getSessionUpdates();
        uint32[] memory sortedListIndexes = getOrderedListIndexes(sessionUpdates);
        dispatcher.dispatch(
            abi.encodeCall(Actions.FINALISE_COMBAT, (Node.CombatSession(1), sessionUpdates, sortedListIndexes))
        );
    }

    function _getSessionUpdates() private returns (CombatRule.CombatAction[][] memory) {
        return _getSessionUpdates(new CombatRule.CombatAction[][](0));
    }

    function _getSessionUpdates(CombatRule.CombatAction[][] memory prevSessionUpdates)
        private
        returns (CombatRule.CombatAction[][] memory)
    {
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
        CombatRule.CombatAction[][] memory sessionUpdates =
            new CombatRule.CombatAction[][](sessionUpdatesLength + prevSessionUpdates.length);
        for (uint256 i = 0; i < prevSessionUpdates.length; i++) {
            sessionUpdates[i] = prevSessionUpdates[i];
        }

        // Decode new events
        for (uint256 i = 0; i < sessionUpdatesLength; i++) {
            ( /* uint256 */ , /* uint256 */, bytes memory combatActionsEncoded) =
                abi.decode(sessionUpdateEvents[i].data, (uint256, uint256, bytes));
            // _logActionList(combatActionsEncoded);
            (sessionUpdates[i + prevSessionUpdates.length]) =
                abi.decode(combatActionsEncoded, (CombatRule.CombatAction[]));
        }

        return sessionUpdates;
    }

    function _logActionList(bytes memory encodedActions) private view {
        (CombatRule.CombatAction[] memory combatActions) = abi.decode(encodedActions, (CombatRule.CombatAction[]));
        for (uint256 i = 0; i < combatActions.length; i++) {
            console.log("actionKind: ", uint8(combatActions[i].kind));
            console.log("entityID: ", uint192(combatActions[i].entityID));
            console.log("blockNum: ", combatActions[i].blockNum);
            if (combatActions[i].kind == CombatRule.CombatActionKind.JOIN) {
                (CombatRule.JoinActionInfo memory info) = abi.decode(combatActions[i].data, (CombatRule.JoinActionInfo));
                console.log("combatSide: ", uint8(info.combatSide));
                console.log("LIFE: ", info.stats[ATOM_LIFE]);
                console.log("ATK: ", info.stats[ATOM_ATTACK]);
                console.log("DEF: ", info.stats[ATOM_DEFENSE]);
            }
        }
    }

    struct CombatActionIndex {
        uint64 blockNum;
        uint16 i;
        uint16 j;
    }

    function getOrderedListIndexes(CombatRule.CombatAction[][] memory sessionUpdates)
        private
        pure
        returns (uint32[] memory)
    {
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
        // spawn a seeker
        vm.startPrank(buildingOwnerAccount);
        bytes24 seeker = _spawnSeekerWithResources();
        // discover an adjacent tile for our building site
        (int16 q, int16 r, int16 s) = (1, -1, 0);
        _discover(q, r, s);
        // get our building and give it the resources to construct
        bytes24 buildingInstance = Node.Building(DEFAULT_ZONE, q, r, s);
        // construct our building
        _transferFromSeeker(seeker, 0, 25, buildingInstance);
        _transferFromSeeker(seeker, 1, 25, buildingInstance);
        _transferFromSeeker(seeker, 2, 25, buildingInstance);
        dispatcher.dispatch(abi.encodeCall(Actions.CONSTRUCT_BUILDING_SEEKER, (seeker, buildingKind, q, r, s)));
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

    // _spawnSeekerWithResources spawns a seeker for the current sender at
    // 0,0,0 with 100 of each resource in an equiped bag
    function _spawnSeekerWithResources() private returns (bytes24) {
        sid++;
        bytes24 seeker = Node.Seeker(sid);
        _discover(0, 0, 0);
        dispatcher.dispatch(abi.encodeCall(Actions.SPAWN_SEEKER, (seeker)));
        bytes24[] memory items = new bytes24[](3);
        items[0] = ItemUtils.Kiki();
        items[1] = ItemUtils.Bouba();
        items[2] = ItemUtils.Semiote();

        uint64[] memory balances = new uint64[](3);
        balances[0] = 100;
        balances[1] = 100;
        balances[2] = 100;

        uint64 seekerBag = uint64(uint256(keccak256(abi.encode(seeker))));
        dispatcher.dispatch(
            abi.encodeCall(
                Actions.DEV_SPAWN_BAG, (seekerBag, state.getOwnerAddress(seeker), seeker, 0, items, balances)
            )
        );

        return seeker;
    }

    function _spawnSeeker(uint32 seekerID, int16 q, int16 r, int16 s) private returns (bytes24) {
        dispatcher.dispatch(abi.encodeCall(Actions.SPAWN_SEEKER, (Node.Seeker(seekerID))));
        dispatcher.dispatch(abi.encodeCall(Actions.MOVE_SEEKER, (sid, q, r, s)));
        vm.roll(block.number + 100);
        return Node.Seeker(sid);
    }

    function _transferFromSeeker(bytes24 seeker, uint8 slot, uint64 qty, bytes24 toBuilding) private {
        bytes24 buildingBag = Node.Bag(uint64(uint256(keccak256(abi.encode(toBuilding)))));
        dispatcher.dispatch(
            abi.encodeCall(
                Actions.TRANSFER_ITEM_SEEKER, (seeker, [seeker, toBuilding], [0, 0], [slot, slot], buildingBag, qty)
            )
        );
    }
}

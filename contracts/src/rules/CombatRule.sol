// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {State, CompoundKeyDecoder} from "cog/State.sol";
import {Context, Rule} from "cog/Dispatcher.sol";

import {
    Schema,
    Node,
    Kind,
    BiomeKind,
    Rel,
    LocationKey,
    TRAVEL_SPEED,
    DEFAULT_ZONE,
    GOO_GREEN,
    GOO_BLUE,
    GOO_RED
} from "@ds/schema/Schema.sol";
import {TileUtils} from "@ds/utils/TileUtils.sol";
import {Actions} from "@ds/actions/Actions.sol";
import "forge-std/console.sol";
import "@ds/utils/Base64.sol";
import "@ds/utils/LibString.sol";
import {ItemUtils} from "@ds/utils/ItemUtils.sol";

using Schema for State;

uint32 constant UNIT_BASE_LIFE = 50;
uint32 constant UNIT_BASE_DEFENCE = 23;
uint32 constant UNIT_BASE_ATTACK = 30;
uint32 constant LIFE_MUL = 10;

uint64 constant BLOCKS_PER_TICK = 1;
uint8 constant MAX_ENTITIES_PER_SIDE = 100; // No higher than 256 due to there being a reward bag for each entity and edges being 8 bit indices
uint8 constant HASH_EDGE_INDEX = 2;

contract CombatRule is Rule {
    uint64 public prevCombatSessionID = 0; // combat sessions are incremented
    uint256 public actionCount; // incremented each time an action event is dispatched. Used to maintain correct order on client side

    enum CombatSideKey {
        ATTACK,
        DEFENCE
    }

    enum CombatActionKind {
        NONE,
        JOIN,
        LEAVE,
        EQUIP
    }

    struct CombatAction {
        CombatActionKind kind;
        bytes24 entityID; // Can be seeker or building
        uint64 blockNum;
        bytes data;
    }

    struct JoinActionInfo {
        CombatSideKey combatSide; // Attack or Defence
        uint32[3] stats; // Based off of atoms. The key is Schema.AtomKind
    }

    struct LeaveActionInfo {
        CombatSideKey combatSide; // Attack or Defence
    }

    struct EquipActionInfo {
        CombatSideKey combatSide; // Attack or Defence
        uint32[3] stats; // Based off of atoms. The key is Schema.AtomKind
    }

    struct CombatState {
        EntityState[] attackerStates;
        EntityState[] defenderStates;
        uint16 attackerCount;
        uint16 defenderCount;
        CombatWinState winState;
        uint16 tickCount;
    }

    struct EntityState {
        bytes24 entityID;
        uint32[3] stats; // TODO: Why aren't these 64bit?
        uint64 damage;
        uint64 damageInflicted; // Each tick, entity's attack stat are added to this property. It actually represents effort more than the damage result
        bool isPresent;
        bool isDead;
        bool hasClaimed;
    }

    enum CombatWinState {
        NONE,
        ATTACKERS,
        DEFENDERS,
        DRAW
    }

    event SessionUpdate(uint64 indexed sessionID, bytes combatActions);

    function reduce(State state, bytes calldata action, Context calldata ctx) public returns (State) {
        if (bytes4(action) == Actions.SPAWN_SEEKER.selector) {
            // decode action
            (bytes24 seeker) = abi.decode(action[4:], (bytes24));

            {
                // If destination has active session then join
                (bytes24 nextTileID, uint64 arrivalBlockNum) =
                    state.get(Rel.Location.selector, uint8(LocationKey.NEXT), seeker);
                bytes24 sessionID = _getActiveSession(state, nextTileID, ctx);
                if (sessionID != 0) {
                    _joinSession(state, sessionID, nextTileID, arrivalBlockNum, seeker);
                }
            }
        }

        if (bytes4(action) == Actions.MOVE_SEEKER.selector) {
            // NOTE: The MovementRule will revert if the following are true:
            //       The sender doesn't own the seeker
            //       The destination tile is undiscoved
            //       The tile isn't a direct 6-axis line

            // decode the action
            (uint32 sid, /*int16 q*/, /*int16 r*/, /*int16 s*/ ) = abi.decode(action[4:], (uint32, int16, int16, int16));

            // encode the full seeker node id
            bytes24 seeker = Node.Seeker(sid);

            {
                // If prev tile has an active session then leave
                (bytes24 prevTileID, /*uint64 arrivalBlockNum*/ ) =
                    state.get(Rel.Location.selector, uint8(LocationKey.PREV), seeker);
                bytes24 sessionID = _getActiveSession(state, prevTileID, ctx);
                if (sessionID != 0) {
                    _leaveSession(state, sessionID, prevTileID, seeker, ctx);
                }
            }

            {
                // If destination has active session then join
                (bytes24 nextTileID, uint64 arrivalBlockNum) =
                    state.get(Rel.Location.selector, uint8(LocationKey.NEXT), seeker);
                bytes24 sessionID = _getActiveSession(state, nextTileID, ctx);
                if (sessionID != 0) {
                    _joinSession(state, sessionID, nextTileID, arrivalBlockNum, seeker);
                }
            }
        }

        if (bytes4(action) == Actions.START_COMBAT.selector) {
            // Decode the action - START_COMBAT(bytes24 seekerID, bytes24 tileID) external;
            (bytes24 seekerID, bytes24 targetTileID, bytes24[] memory attackers, bytes24[] memory defenders) =
                abi.decode(action[4:], (bytes24, bytes24, bytes24[], bytes24[]));

            // Is the seeker owned by the player that dispatched this action?
            _requirePlayerOwnedSeeker(state, seekerID, Node.Player(ctx.sender));

            // Get the current location
            (bytes24 seekerTile) = state.getCurrentLocation(seekerID, ctx.clock);

            // Revert if the current location doesn't match their seeker destination (cannot start a battle whilst moving)
            if (state.getNextLocation(seekerID) != seekerTile) revert("SeekerNotAtDestination");

            // Check that the seeker tile (attack) and target tile (defend) are adjacent
            if (TileUtils.distance(seekerTile, targetTileID) != 1) {
                revert("CombatNotAdjacent");
            }

            // Revert if either of the tiles have an active combat session
            if (_getActiveSession(state, seekerTile, ctx) != 0) revert("CombatSessionAlreadyActive");
            if (_getActiveSession(state, targetTileID, ctx) != 0) revert("CombatSessionAlreadyActive");

            _startSession(state, seekerTile, targetTileID, attackers, defenders, ctx);
        }

        if (bytes4(action) == Actions.TRANSFER_ITEM_SEEKER.selector) {
            // decode the action
            (bytes24 seeker,,,,,) = abi.decode(action[4:], (bytes24, bytes24[2], uint8[2], uint8[2], bytes24, uint64));

            (bytes24 nextTileID, uint64 arrivalBlockNum) =
                state.get(Rel.Location.selector, uint8(LocationKey.NEXT), seeker);
            bytes24 sessionID = _getActiveSession(state, nextTileID, ctx);
            if (sessionID != 0) {
                _equip(state, sessionID, nextTileID, arrivalBlockNum, seeker, ctx);
            }
        }

        if (bytes4(action) == Actions.FINALISE_COMBAT.selector) {
            (bytes24 sessionID, CombatRule.CombatAction[][] memory sessionUpdates, uint32[] memory sortedListIndexes) =
                abi.decode(action[4:], (bytes24, CombatRule.CombatAction[][], uint32[]));

            // Check hash of actions matches hash of session (ensures supplied actions haven't been tampered with)
            if (!_checkSessionHash(state, sessionID, sessionUpdates)) revert("CombatSessionHashIncorrect");

            CombatState memory combatState = calcCombatState(sessionUpdates, sortedListIndexes, ctx.clock);
            if (combatState.winState != CombatWinState.NONE && !state.getIsFinalised(sessionID)) {
                _finaliseSession(state, combatState, sessionID);
            }
        }

        return state;
    }

    function _equip(
        State state,
        bytes24 sessionID,
        bytes24 seekerTileID,
        uint64 arrivalBlockNum,
        bytes24 seekerID,
        Context calldata ctx
    ) private {
        (bytes24 attackTileID, /*uint64 combatStartBlock*/ ) =
            state.get(Rel.Has.selector, uint8(CombatSideKey.ATTACK), sessionID);

        EquipActionInfo memory info = EquipActionInfo({
            combatSide: attackTileID == seekerTileID ? CombatSideKey.ATTACK : CombatSideKey.DEFENCE,
            stats: _getStatsForEntity(state, seekerID)
        });

        // NOTE: Held in an array to keep it the same as the encoding used when starting combat
        CombatAction[] memory combatActions = new CombatAction[](1);
        combatActions[0] = CombatAction(
            CombatActionKind.EQUIP,
            seekerID,
            arrivalBlockNum > ctx.clock ? arrivalBlockNum : ctx.clock,
            abi.encode(info)
        );

        _emitSessionUpdate(state, sessionID, combatActions);
    }

    function _finaliseSession(State state, CombatState memory combatState, bytes24 sessionID) private {
        // Get the winning entities
        EntityState[] memory winnerStates =
            combatState.winState == CombatWinState.ATTACKERS ? combatState.attackerStates : combatState.defenderStates;
        EntityState[] memory loserStates =
            combatState.winState == CombatWinState.ATTACKERS ? combatState.defenderStates : combatState.attackerStates;

        // Get fallen building
        EntityState memory buildingState;
        for (uint256 i = 0; i < loserStates.length; i++) {
            if (bytes4(loserStates[i].entityID) == Kind.Building.selector) {
                buildingState = loserStates[i];
            }
        }

        if (bytes4(buildingState.entityID) == Kind.Building.selector) {
            // Spawn bags with winnings for each of the seekers
            // FIXME: If there is any way of making this less gassy? stack to deep to cache totalDamageInflicted and the building's materials!
            for (uint8 i; i < MAX_ENTITIES_PER_SIDE; i++) {
                if (!winnerStates[i].isPresent) continue;
                // Create bag using a combination of sessionID and entityID
                // TODO: Don't give buildings rewards? (leaving in as a sink for now)
                state.set(Rel.Equip.selector, i, sessionID, Node.RewardBag(sessionID, winnerStates[i].entityID), 0); // Session -> Bag

                uint256 damagePercent = (winnerStates[i].damageInflicted * 100) / _getTotalDamageInflicted(winnerStates);

                for (uint8 j; j < 4; j++) {
                    (bytes24 item, uint64 qty) = state.getMaterial(state.getBuildingKind(buildingState.entityID), j);
                    // NOTE: divide by 200 instead of 100 if we want to halve the rewards as per the combat spec
                    state.setItemSlot(
                        Node.RewardBag(sessionID, winnerStates[i].entityID),
                        j,
                        item,
                        uint64((damagePercent * qty) / 100)
                    );
                }
            }

            // TODO: If the building has a bag, then transfer to the seeker with the most damage inflicted

            // Destroy the building
            // TODO: Maybe the building rule should be doing this so all building construction/destruction logic is in the same place
            //       The building rule would need to be able to check that the action was dispatched by the CombatRule
            _destroyBuilding(state, buildingState.entityID);
        }

        state.setIsFinalised(sessionID, true);
    }

    function _destroyBuilding(State state, bytes24 buildingInstance) private {
        // set type of building
        state.setBuildingKind(buildingInstance, bytes24(0));
        // set building owner to player who created it
        state.setOwner(buildingInstance, bytes24(0));
        // set building location
        state.setFixedLocation(buildingInstance, bytes24(0));

        // TODO: Orphaned bags
        state.setEquipSlot(buildingInstance, 0, bytes24(0));
        state.setEquipSlot(buildingInstance, 1, bytes24(0));
    }

    // Only counts entities that are present
    function _getTotalDamageInflicted(EntityState[] memory entityStates)
        private
        pure
        returns (uint256 totalDamageInflicted)
    {
        for (uint256 i = 0; i < entityStates.length; i++) {
            // Doesn't matter if they are dead or alive, just need to be present
            if (entityStates[i].isPresent) {
                totalDamageInflicted += entityStates[i].damageInflicted;
            }
        }

        return totalDamageInflicted;
    }

    function _getEntityState(CombatState memory combatState, bytes24 entityID)
        private
        pure
        returns (EntityState memory entityState, bool isAttacker)
    {
        // Search attackers
        for (uint256 i = 0; i < combatState.attackerStates.length; i++) {
            entityState = combatState.attackerStates[i];
            if (entityState.entityID == entityID) return (entityState, true);
        }

        // Search defenders
        for (uint256 i = 0; i < combatState.defenderStates.length; i++) {
            entityState = combatState.defenderStates[i];
            if (entityState.entityID == entityID) return (entityState, false);
        }

        return (entityState, false);
    }

    // Calculates combat state by stepping through the actions and playing the tick by tick logic until `endBlockNum`
    function calcCombatState(
        CombatAction[][] memory sessionUpdates,
        uint32[] memory sortedListIndexes,
        uint64 endBlockNum
    ) public pure returns (CombatState memory combatState) {
        combatState = CombatState({
            attackerStates: new EntityState[](MAX_ENTITIES_PER_SIDE),
            defenderStates: new EntityState[](MAX_ENTITIES_PER_SIDE),
            attackerCount: 0,
            defenderCount: 0,
            winState: CombatWinState.NONE,
            tickCount: 0
        });

        for (uint64 x = 0; x < sortedListIndexes.length; x++) {
            CombatAction memory combatAction =
                sessionUpdates[uint16(sortedListIndexes[x])][uint16(sortedListIndexes[x] >> 16)];

            if (combatAction.blockNum > endBlockNum) {
                // Battle not finished
                return (combatState);
            }

            // How many ticks does this action apply to?
            uint64 actionEndBlock = x + 1 < sortedListIndexes.length
                ? sessionUpdates[uint16(sortedListIndexes[x + 1])][uint16(sortedListIndexes[x + 1] >> 16)].blockNum
                : endBlockNum;

            if (actionEndBlock > endBlockNum) {
                actionEndBlock = endBlockNum;
            }

            // Apply action
            if (combatAction.kind == CombatActionKind.JOIN) {
                (JoinActionInfo memory info) = abi.decode(combatAction.data, (JoinActionInfo));
                _addEntityToCombat(combatState, combatAction, info);
            } else if (combatAction.kind == CombatActionKind.LEAVE) {
                (LeaveActionInfo memory info) = abi.decode(combatAction.data, (LeaveActionInfo));
                _removeEntityFromCombat(combatState, combatAction, info);

                // Check if either side has entirely left combat
                if (combatState.attackerCount == 0) {
                    combatState.winState = CombatWinState.DEFENDERS;
                    return (combatState);
                } else if (combatState.defenderCount == 0) {
                    combatState.winState = CombatWinState.ATTACKERS;
                    return (combatState);
                }
            } else if (combatAction.kind == CombatActionKind.EQUIP) {
                (EquipActionInfo memory info) = abi.decode(combatAction.data, (EquipActionInfo));
                _updateEntityStats(combatState, combatAction, info);
            }

            // Tick the battle until the next action
            uint64 numTicks = (actionEndBlock - combatAction.blockNum) / BLOCKS_PER_TICK;
            for (uint16 t = 0; t < numTicks; t++) {
                // Attackers attack
                _combatLogic(combatState, CombatSideKey.ATTACK, combatAction.blockNum);
                if (combatState.defenderCount == 0) {
                    combatState.winState = CombatWinState.ATTACKERS;
                    return (combatState);
                }

                // Defenders attack
                _combatLogic(combatState, CombatSideKey.DEFENCE, combatAction.blockNum);
                if (combatState.attackerCount == 0) {
                    combatState.winState = CombatWinState.DEFENDERS;
                    return (combatState);
                }
            }

            combatState.tickCount++;
        }

        // As there is no longer a block limit to combat so cannot draw
        // if (combatState.winState == CombatWinState.NONE) {
        //     combatState.winState = CombatWinState.DRAW;
        // }
    }

    // NOTE: entityIndex is the index within one of the two arrays and entityNum is witin the whole battle
    function _combatLogic(CombatState memory combatState, CombatSideKey combatSide, uint64 blockNum) private pure {
        // TODO: obviously not random
        bytes32 rnd = keccak256(abi.encode(blockNum, combatState.tickCount));

        // Sum up attack from all present entities
        uint256 attackTotal = _getAttackTotal(
            combatSide == CombatSideKey.ATTACK ? combatState.attackerStates : combatState.defenderStates
        );

        // Select entity from opposing side
        EntityState memory enemyState = _selectPresentEntity(
            combatSide == CombatSideKey.ATTACK ? combatState.defenderStates : combatState.attackerStates,
            uint16(uint256(rnd))
                % (combatSide == CombatSideKey.ATTACK ? combatState.defenderCount : combatState.attackerCount)
        );

        if (attackTotal > enemyState.stats[GOO_BLUE]) {
            enemyState.damage += uint64(attackTotal - enemyState.stats[GOO_BLUE]);
        } else {
            enemyState.damage += 1;
        }

        // Is enemy defeated?
        if (enemyState.damage >= enemyState.stats[GOO_GREEN]) {
            enemyState.isDead = true;
            if (combatSide == CombatSideKey.ATTACK) {
                combatState.defenderCount--;
            } else {
                combatState.attackerCount--;
            }
        }
    }

    function _getAttackTotal(EntityState[] memory entityStates) private pure returns (uint64 totalAttack) {
        for (uint16 i = 0; i < entityStates.length; i++) {
            if (entityStates[i].isPresent && !entityStates[i].isDead) {
                // TODO: overflow checks on these
                totalAttack += entityStates[i].stats[GOO_RED];
                entityStates[i].damageInflicted += entityStates[i].stats[GOO_RED];
            }
        }
    }

    function _selectPresentEntity(EntityState[] memory entityStates, uint16 entityNum)
        private
        pure
        returns (EntityState memory)
    {
        uint16 entityCount;
        for (uint16 i = 0; i < entityStates.length; i++) {
            if (entityStates[i].isPresent && !entityStates[i].isDead) {
                if (entityCount == entityNum) {
                    return entityStates[i];
                }
                entityCount++;
            }
        }

        revert("CombatRule::_selectPrensentEntity() EntityNum out of range");
    }

    function _addEntityToCombat(
        CombatState memory combatState,
        CombatAction memory combatAction,
        JoinActionInfo memory info
    ) private pure {
        EntityState[] memory entityStates =
            info.combatSide == CombatSideKey.ATTACK ? combatState.attackerStates : combatState.defenderStates;

        uint256 i;
        for (i = 0; i < entityStates.length; i++) {
            if (entityStates[i].entityID == combatAction.entityID) {
                if (entityStates[i].isPresent || entityStates[i].isDead) {
                    return;
                }

                // Rejoin
                entityStates[i].isPresent = true;
                entityStates[i].stats = info.stats;

                break;
            }
            if (entityStates[i].entityID == 0) {
                // First time joining
                entityStates[i] = EntityState({
                    entityID: combatAction.entityID,
                    stats: info.stats,
                    damage: 0,
                    damageInflicted: 0,
                    isPresent: true,
                    isDead: false,
                    hasClaimed: false
                });

                break;
            }
        }

        // Ran out of slots!
        if (i == entityStates.length) return;

        if (info.combatSide == CombatSideKey.ATTACK) {
            combatState.attackerCount++;
        } else {
            combatState.defenderCount++;
        }
    }

    function _updateEntityStats(
        CombatState memory combatState,
        CombatAction memory combatAction,
        EquipActionInfo memory info
    ) private pure {
        EntityState[] memory entityStates =
            info.combatSide == CombatSideKey.ATTACK ? combatState.attackerStates : combatState.defenderStates;

        for (uint256 i = 0; i < entityStates.length; i++) {
            if (entityStates[i].entityID == combatAction.entityID) {
                // Only update their stats if they are present
                if (!entityStates[i].isPresent) {
                    return;
                }
                entityStates[i].stats = info.stats;

                break;
            }
        }
    }

    function _removeEntityFromCombat(
        CombatState memory combatState,
        CombatAction memory combatAction,
        LeaveActionInfo memory info
    ) private pure {
        EntityState[] memory entityStates =
            info.combatSide == CombatSideKey.ATTACK ? combatState.attackerStates : combatState.defenderStates;

        for (uint256 i = 0; i < entityStates.length; i++) {
            if (entityStates[i].entityID == combatAction.entityID && entityStates[i].isPresent) {
                entityStates[i].isPresent = false;
                if (info.combatSide == CombatSideKey.ATTACK) {
                    combatState.attackerCount--;
                } else {
                    combatState.defenderCount--;
                }
                return;
            }
        }
    }

    function _checkSessionHash(State state, bytes24 sessionID, CombatRule.CombatAction[][] memory sessionUpdates)
        private
        view
        returns (bool)
    {
        // Check that the hashes match. Every combat list update is hashed against the last
        bytes20 combatActionsHash;
        for (uint256 i = 0; i < sessionUpdates.length; i++) {
            combatActionsHash = bytes20(keccak256(abi.encodePacked(combatActionsHash, abi.encode(sessionUpdates[i]))));
        }

        bytes20 storedHash = state.getHash(sessionID, HASH_EDGE_INDEX);
        return storedHash == combatActionsHash;
    }

    function _getActiveSession(State state, bytes24 tileID, Context calldata /*ctx*/ ) private view returns (bytes24) {
        (bytes24 sessionID, uint64 startBlockNum) = state.get(Rel.Has.selector, 0, tileID);
        if (startBlockNum > 0 && !state.getIsFinalised(sessionID)) return sessionID;

        return 0;
    }

    function _startSession(
        State state,
        bytes24 attTileID,
        bytes24 defTileID,
        bytes24[] memory attackers,
        bytes24[] memory defenders,
        Context calldata ctx
    ) private {
        // Create a new session
        prevCombatSessionID++;
        uint64 sessionID = prevCombatSessionID;

        {
            // Link the session to the tiles
            bytes24 sessionNode = Node.CombatSession(sessionID);
            state.set(Rel.Has.selector, uint8(CombatSideKey.ATTACK), sessionNode, attTileID, ctx.clock);
            state.set(Rel.Has.selector, uint8(CombatSideKey.DEFENCE), sessionNode, defTileID, ctx.clock);

            // TODO: Find another way of doing this because making a two way connection is expensive
            // TODO: Refactor 'Has' to 'Session' and increment the index so that rewards can be seen on tiles for old sessions
            state.set(Rel.Has.selector, 0, attTileID, sessionNode, ctx.clock);
            state.set(Rel.Has.selector, 0, defTileID, sessionNode, ctx.clock);
        }

        // Need a join action for each of the entities on the tiles
        CombatAction[] memory sessionActions = new CombatAction[](attackers.length + defenders.length);

        // Join each of the attackers to the session
        // NOTE: Actions are not held in the graph!
        // NOTE: For now not including buildings because with auto opt in, a building owned by the same person as the adjacent
        //       building end up attacking their own building which seems really odd.
        {
            for (uint256 i = 0; i < attackers.length; i++) {
                uint64 arrivalBlockNum;
                bytes24 entityTileID;

                if (bytes4(attackers[i]) == Kind.Seeker.selector) {
                    (entityTileID, arrivalBlockNum) =
                        state.get(Rel.Location.selector, uint8(LocationKey.NEXT), attackers[i]);

                    if (entityTileID != attTileID) revert("EntityNotAtAttackTile");
                }

                JoinActionInfo memory info =
                    JoinActionInfo({combatSide: CombatSideKey.ATTACK, stats: _getStatsForEntity(state, attackers[i])});

                sessionActions[i] = CombatAction(
                    CombatActionKind.JOIN,
                    attackers[i],
                    arrivalBlockNum > ctx.clock ? arrivalBlockNum : ctx.clock,
                    abi.encode(info)
                );
            }
        }

        // Join each of the defenders to the session
        {
            for (uint256 i = 0; i < defenders.length; i++) {
                uint64 arrivalBlockNum;
                bytes24 entityTileID;

                if (bytes4(defenders[i]) == Kind.Seeker.selector) {
                    (entityTileID, arrivalBlockNum) =
                        state.get(Rel.Location.selector, uint8(LocationKey.NEXT), defenders[i]);
                    if (entityTileID != defTileID) revert("EntityNotAtDefenceTile");
                }

                JoinActionInfo memory info =
                    JoinActionInfo({combatSide: CombatSideKey.DEFENCE, stats: _getStatsForEntity(state, defenders[i])});

                sessionActions[attackers.length + i] = CombatAction(
                    CombatActionKind.JOIN,
                    defenders[i],
                    arrivalBlockNum > ctx.clock ? arrivalBlockNum : ctx.clock,
                    abi.encode(info)
                );
            }
        }

        _emitSessionUpdate(state, Node.CombatSession(sessionID), sessionActions);
    }

    // NOTE: Using the term entity as it can be either a Seeker or a Building
    // TODO: A more scalable way of encoding could be a byte array encoded AtomKind,Amount,AtomKind,Amount
    //       Or maybe just an array of Schema.AtomCount
    function _getStatsForEntity(State state, bytes24 entityID) private view returns (uint32[3] memory) {
        uint32[3] memory stats;

        if (bytes4(entityID) == Kind.Seeker.selector) {
            // Made up base stats for seeker
            stats[GOO_GREEN] = UNIT_BASE_LIFE * LIFE_MUL;
            stats[GOO_BLUE] = UNIT_BASE_DEFENCE;
            stats[GOO_RED] = UNIT_BASE_ATTACK;

            // iterate over Items within Bags and sum up Atoms that belong to the Items (limited to 2 bags)
            for (uint8 i = 0; i < 2; i++) {
                bytes24 bag = state.getEquipSlot(entityID, i);
                if (bytes4(bag) == Kind.Bag.selector) {
                    // 4 items slots per bag
                    for (uint8 j = 0; j < 4; j++) {
                        (bytes24 item, uint64 balance) = state.getItemSlot(bag, j);
                        (uint32[3] memory inputAtoms, bool isStackable) = state.getItemStructure(item);
                        if (!isStackable && balance > 0) {
                            for (uint8 k = 0; k < 3; k++) {
                                stats[k] += inputAtoms[k] * (k == GOO_GREEN ? LIFE_MUL : 1);
                            }
                        }
                    }
                }
            }
        } else {
            for (uint8 i = 0; i < 4; i++) {
                (bytes24 item, uint64 qty) = state.getMaterial(state.getBuildingKind(entityID), i);
                (uint32[3] memory inputAtoms, /*bool isStackable*/ ) = state.getItemStructure(item);
                for (uint8 j = 0; j < 3; j++) {
                    stats[j] += inputAtoms[j] * uint32(qty) * (j == GOO_GREEN ? LIFE_MUL : 1);
                }
            }
        }

        return stats;
    }

    function _joinSession(
        State state,
        bytes24 sessionID,
        bytes24 seekerTileID,
        uint64 arrivalBlockNum,
        bytes24 seekerID
    ) private {
        (bytes24 attackTileID, /*uint64 combatStartBlock*/ ) =
            state.get(Rel.Has.selector, uint8(CombatSideKey.ATTACK), sessionID);

        JoinActionInfo memory info = JoinActionInfo({
            combatSide: attackTileID == seekerTileID ? CombatSideKey.ATTACK : CombatSideKey.DEFENCE,
            stats: _getStatsForEntity(state, seekerID)
        });

        // NOTE: Held in an array to keep it the same as the encoding used when starting combat
        CombatAction[] memory combatActions = new CombatAction[](1);
        combatActions[0] = CombatAction(CombatActionKind.JOIN, seekerID, arrivalBlockNum, abi.encode(info));

        _emitSessionUpdate(state, sessionID, combatActions);
    }

    function _leaveSession(State state, bytes24 sessionID, bytes24 seekerTileID, bytes24 seekerID, Context calldata ctx)
        private
    {
        (bytes24 attackTileID, /*uint64 combatStartBlock*/ ) =
            state.get(Rel.Has.selector, uint8(CombatSideKey.ATTACK), sessionID);

        LeaveActionInfo memory info =
            LeaveActionInfo({combatSide: attackTileID == seekerTileID ? CombatSideKey.ATTACK : CombatSideKey.DEFENCE});

        // NOTE: Held in an array to keep it the same encoding as used when starting combat
        CombatAction[] memory combatActions = new CombatAction[](1);
        combatActions[0] = CombatAction(CombatActionKind.LEAVE, seekerID, ctx.clock, abi.encode(info));

        _emitSessionUpdate(state, sessionID, combatActions);
    }

    // NOTE: sessionUpdate is an encoded array of CombatActions
    function _updateHash(State state, uint64 sessionID, bytes memory sessionUpdate) private returns (bytes20) {
        bytes24 sessionNode = Node.CombatSession(sessionID);
        bytes20 prevHash = state.getHash(sessionNode, HASH_EDGE_INDEX); // NOTE: Starts at 2 as I'm also using 'Has' edges to point to the 2 combat tiles
        bytes20 newHash = bytes20(keccak256(abi.encodePacked(prevHash, sessionUpdate)));

        // NOTE: Starts at 2 as I'm also using 'Has' edges to point to the 2 combat tiles
        state.setHash(newHash, sessionNode, HASH_EDGE_INDEX);
        return newHash;
    }

    function _requirePlayerOwnedSeeker(State state, bytes24 seeker, bytes24 player) private view {
        if (state.getOwner(seeker) != player) {
            revert("SeekerNotOwnedByPlayer");
        }
    }

    function _emitSessionUpdate(State state, bytes24 sessionID, CombatAction[] memory sessionActions) private {
        actionCount++;
        _updateHash(state, CompoundKeyDecoder.UINT64(sessionID), abi.encode(sessionActions));
        emit SessionUpdate(CompoundKeyDecoder.UINT64(sessionID), abi.encode(sessionActions));
        state.annotate(
            sessionID,
            string(abi.encodePacked("action-", LibString.toString(actionCount))),
            Base64.encode(abi.encode(sessionActions))
        );
    }

    // -- MATH

    // function min(int256 a, int256 b) public pure returns (int256) {
    //     return a < b ? a : b;
    // }

    // function max(int256 a, int256 b) public pure returns (int256) {
    //     return a > b ? a : b;
    // }
}

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "cog/IState.sol";
import "cog/IRule.sol";
import "cog/IDispatcher.sol";

import {CombatActionKind, CombatAction, Actions} from "@ds/actions/Actions.sol";

import {
    Schema,
    Node,
    Kind,
    BiomeKind,
    Rel,
    LocationKey,
    CombatSideKey,
    TRAVEL_SPEED,
    GOO_GREEN,
    GOO_BLUE,
    GOO_RED,
    UNIT_BASE_LIFE,
    UNIT_BASE_DEFENCE,
    UNIT_BASE_ATTACK,
    LIFE_MUL
} from "@ds/schema/Schema.sol";
import {TileUtils} from "@ds/utils/TileUtils.sol";
import {ItemUtils} from "@ds/utils/ItemUtils.sol";

using Schema for State;

uint64 constant COMBAT_JOIN_WINDOW_BLOCKS = 7;
uint64 constant BLOCKS_PER_TICK = 1;
uint64 constant MAX_TICKS = 300;
uint8 constant MAX_ENTITIES_PER_SIDE = 100; // max allowed is 255 due to there being a reward bag for each entity and edges being 8 bit indices
uint8 constant HASH_EDGE_INDEX = 2;

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

contract CombatRule is Rule {
    uint64 public prevCombatSessionID = 0; // combat sessions are incremented

    event SessionUpdate(uint64 indexed sessionID, bytes combatActions);

    function reduce(State state, bytes calldata action, Context calldata ctx) public returns (State) {
        if (bytes4(action) == Actions.SPAWN_MOBILE_UNIT.selector) {
            bytes24 mobileUnit = Node.MobileUnit(ctx.sender);
            {
                // If destination has active session then join
                (bytes24 nextTileID, uint64 arrivalBlockNum) =
                    state.get(Rel.Location.selector, uint8(LocationKey.NEXT), mobileUnit);
                bytes24 sessionID = _getActiveSession(state, nextTileID, ctx);
                if (sessionID != 0) {
                    _joinSession(state, sessionID, nextTileID, arrivalBlockNum, mobileUnit);
                }
            }
        }

        // We still record the joining and leaving of units as we cannot get a list of which units are standing on a particular tile at finalisation time
        if (bytes4(action) == Actions.MOVE_MOBILE_UNIT.selector) {
            // NOTE: The MovementRule will revert if the following are true:
            //       The sender doesn't own the mobileUnit
            //       The destination tile is undiscoved
            //       The tile isn't a direct 6-axis line

            // encode the full mobileUnit node id
            bytes24 mobileUnit = Node.MobileUnit(ctx.sender);

            {
                // If prev tile has an active session then leave
                (bytes24 prevTileID, /*uint64 arrivalBlockNum*/ ) =
                    state.get(Rel.Location.selector, uint8(LocationKey.PREV), mobileUnit);
                bytes24 sessionID = _getActiveSession(state, prevTileID, ctx);
                if (sessionID != 0) {
                    _leaveSession(state, sessionID, prevTileID, mobileUnit, ctx);
                }
            }

            {
                // If destination has active session then join
                (bytes24 nextTileID, uint64 arrivalBlockNum) =
                    state.get(Rel.Location.selector, uint8(LocationKey.NEXT), mobileUnit);
                bytes24 sessionID = _getActiveSession(state, nextTileID, ctx);
                if (sessionID != 0) {
                    _joinSession(state, sessionID, nextTileID, arrivalBlockNum, mobileUnit);
                }
            }
        }

        if (bytes4(action) == Actions.START_COMBAT.selector) {
            // Decode the action - START_COMBAT(bytes24 mobileUnitID, bytes24 tileID) external;
            (bytes24 mobileUnitID, bytes24 targetTileID, bytes24[] memory attackers, bytes24[] memory defenders) =
                abi.decode(action[4:], (bytes24, bytes24, bytes24[], bytes24[]));

            // Is the mobileUnit owned by the player that dispatched this action?
            _requirePlayerOwnedMobileUnit(state, mobileUnitID, Node.Player(ctx.sender));

            // Get the current location
            (bytes24 mobileUnitTile) = state.getCurrentLocation(mobileUnitID, ctx.clock);

            // Revert if the current location doesn't match their mobileUnit destination (cannot start a battle whilst moving)
            if (state.getNextLocation(mobileUnitID) != mobileUnitTile) revert("MobileUnitNotAtDestination");

            // Check that the mobileUnit tile (attack) and target tile (defend) are adjacent
            if (TileUtils.distance(mobileUnitTile, targetTileID) != 1) {
                revert("CombatNotAdjacent");
            }

            // Revert if either of the tiles have an active combat session
            if (_getActiveSession(state, mobileUnitTile, ctx) != 0) revert("CombatSessionAlreadyActive");
            if (_getActiveSession(state, targetTileID, ctx) != 0) revert("CombatSessionAlreadyActive");

            _startSession(state, mobileUnitTile, targetTileID, attackers, defenders, ctx);
        }

        if (bytes4(action) == Actions.FINALISE_COMBAT.selector) {
            (bytes24 sessionID) = abi.decode(action[4:], (bytes24));

            ( /*bytes24 attackTileID*/ , uint64 combatStartBlock) = state.getAttackTile(sessionID);

            require(!state.getIsFinalised(sessionID), "Combat session already finalised");

            CombatState memory combatState = calcCombatState(state, sessionID);

            // We only care about start time if there are entities on both sides. Combat can be finalised if one
            // side has no entities
            if (combatState.attackerCount > 0 && combatState.defenderCount > 0) {
                require(ctx.clock >= combatStartBlock, "Cannot finalise combat before it has started");
            }

            _finaliseSession(state, combatState, sessionID);
        }

        return state;
    }

    function _finaliseSession(State state, CombatState memory combatState, bytes24 sessionID) private {
        // No winner
        if (combatState.winState == CombatWinState.NONE) {
            state.setIsFinalised(sessionID, true);
            return;
        }

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
            // Spawn bags with winnings for each of the mobileUnits
            // FIXME: If there is any way of making this less gassy? stack to deep to cache totalDamageInflicted and the building's materials!
            for (uint8 i; i < MAX_ENTITIES_PER_SIDE; i++) {
                if (!winnerStates[i].isPresent) continue;
                // Create bag using a combination of sessionID and entityID
                // TODO: Don't give buildings rewards? (leaving in as a sink for now)
                state.set(Rel.Equip.selector, i, sessionID, Node.RewardBag(sessionID, winnerStates[i].entityID), 0); // Session -> Bag
                _setBagOwner(state, Node.RewardBag(sessionID, winnerStates[i].entityID), winnerStates[i].entityID);

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

            // TODO: If the building has a bag, then transfer to the mobileUnit with the most damage inflicted

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
        state.removeParent(buildingInstance);
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
    function calcCombatState(State state, bytes24 sessionID) private view returns (CombatState memory combatState) {
        // (bytes24 attackTileID, /*uint64 combatStartBlock*/ ) = state.getAttackTile(sessionID);

        // This state gets updated every tick
        combatState = CombatState({
            attackerStates: new EntityState[](MAX_ENTITIES_PER_SIDE),
            defenderStates: new EntityState[](MAX_ENTITIES_PER_SIDE),
            attackerCount: 0,
            defenderCount: 0,
            winState: CombatWinState.NONE,
            tickCount: 0
        });

        // -- Add all entities to the combat state at block 0

        // Add attackers
        for (uint8 i = 0; i < MAX_ENTITIES_PER_SIDE; i++) {
            bytes24 entityID = state.getAttacker(sessionID, i);
            if (entityID != bytes24(0)) {
                // NOTE: JoinActionInfo used to be encoded in the off-chain recorded CombatAction.data
                _addEntityToCombat(
                    combatState,
                    CombatAction({kind: CombatActionKind.JOIN, entityID: entityID, blockNum: 0, data: ""}),
                    JoinActionInfo({combatSide: CombatSideKey.ATTACK, stats: _getStatsForEntity(state, entityID)})
                );
            }
        }

        // Add Defenders
        for (uint8 i = 0; i < MAX_ENTITIES_PER_SIDE; i++) {
            bytes24 entityID = state.getDefender(sessionID, i);
            if (entityID != bytes24(0)) {
                // NOTE: JoinActionInfo used to be encoded in the off-chain recorded CombatAction.data
                _addEntityToCombat(
                    combatState,
                    CombatAction({kind: CombatActionKind.JOIN, entityID: entityID, blockNum: 0, data: ""}),
                    JoinActionInfo({combatSide: CombatSideKey.DEFENCE, stats: _getStatsForEntity(state, entityID)})
                );
            }
        }

        // If nobody present on either side when combat finalises then no combat happened
        if (combatState.attackerCount == 0 || combatState.defenderCount == 0) {
            return combatState;
        }

        // Run through all the ticks
        for (uint64 t = 0; t < MAX_TICKS; t++) {
            // Attackers attack
            _combatLogic(combatState, CombatSideKey.ATTACK, t);
            if (combatState.defenderCount == 0) {
                combatState.winState = CombatWinState.ATTACKERS;
                return (combatState);
            }

            // Defenders attack
            _combatLogic(combatState, CombatSideKey.DEFENCE, t);
            if (combatState.attackerCount == 0) {
                combatState.winState = CombatWinState.DEFENDERS;
                return (combatState);
            }

            combatState.tickCount++; // Now all actions start at zero, this should always equal t
            if (combatState.tickCount == MAX_TICKS) {
                combatState.winState = CombatWinState.DRAW;
                return combatState;
            }
        }

        // if we got here, then we hit MAX_TICKS without a winner, it's a DRAW
        if (combatState.winState == CombatWinState.NONE) {
            combatState.winState = CombatWinState.DRAW;
        }

        return combatState;
    }

    // NOTE: entityIndex is the index within one of the two arrays and entityNum is witin the whole battle
    function _combatLogic(CombatState memory combatState, CombatSideKey combatSide, uint64 tick) private view {
        // TODO: obviously not random
        bytes32 rnd = keccak256(abi.encode(block.number, tick, combatState.tickCount, combatSide));

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
            // Defence higher than attack so deal minimum damage
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
        uint64 rawSessionID = prevCombatSessionID;

        {
            // Link the session to the tiles
            bytes24 sessionID = Node.CombatSession(rawSessionID);
            state.setParent(sessionID, state.getParent(attTileID));
            state.set(
                Rel.Has.selector,
                uint8(CombatSideKey.ATTACK),
                sessionID,
                attTileID,
                ctx.clock + COMBAT_JOIN_WINDOW_BLOCKS
            );
            state.set(
                Rel.Has.selector,
                uint8(CombatSideKey.DEFENCE),
                sessionID,
                defTileID,
                ctx.clock + COMBAT_JOIN_WINDOW_BLOCKS
            );

            // We make a relationship from tile to session so we can check if a particular tile is in session
            state.set(Rel.Has.selector, 0, attTileID, sessionID, ctx.clock + COMBAT_JOIN_WINDOW_BLOCKS);
            state.set(Rel.Has.selector, 0, defTileID, sessionID, ctx.clock + COMBAT_JOIN_WINDOW_BLOCKS);

            // -- We make log who is standing on the attack/defence tiles because we cannot get a list of who is standing at a particular tile

            // Join all attackers
            for (uint256 i = 0; i < attackers.length; i++) {
                _joinSession(state, sessionID, attTileID, 0, attackers[i]);
            }

            // Join all defenders
            for (uint256 i = 0; i < defenders.length; i++) {
                _joinSession(state, sessionID, defTileID, 0, defenders[i]);
            }
        }
    }

    // NOTE: Using the term entity as it can be either a MobileUnit or a Building
    // TODO: A more scalable way of encoding could be a byte array encoded AtomKind,Amount,AtomKind,Amount
    //       Or maybe just an array of Schema.AtomCount
    function _getStatsForEntity(State state, bytes24 entityID) private view returns (uint32[3] memory) {
        uint32[3] memory stats;

        if (bytes4(entityID) == Kind.MobileUnit.selector) {
            // Made up base stats for mobileUnit
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
        bytes24 mobileUnitTileID,
        uint64, /*arrivalBlockNum*/
        bytes24 mobileUnitID
    ) private {
        (bytes24 attackTileID, /*uint64 combatStartBlock*/ ) = state.getAttackTile(sessionID);

        // Find an empty slot of the combatSide the unit is joining
        for (uint8 i = 0; i < MAX_ENTITIES_PER_SIDE; i++) {
            bytes24 entityID =
                attackTileID == mobileUnitTileID ? state.getAttacker(sessionID, i) : state.getDefender(sessionID, i);
            if (entityID == bytes24(0)) {
                if (attackTileID == mobileUnitTileID) {
                    state.setAttacker(sessionID, i, mobileUnitID, 0);
                    break;
                } else {
                    state.setDefender(sessionID, i, mobileUnitID, 0);
                    break;
                }
            }
        }
    }

    function _leaveSession(
        State state,
        bytes24 sessionID,
        bytes24 mobileUnitTileID,
        bytes24 mobileUnitID,
        Context calldata /*ctx*/
    ) private {
        (bytes24 attackTileID, /*uint64 combatStartBlock*/ ) = state.getAttackTile(sessionID);

        // Find slot belonging to unitID and set to zero
        for (uint8 i = 0; i < MAX_ENTITIES_PER_SIDE; i++) {
            bytes24 entityID =
                attackTileID == mobileUnitTileID ? state.getAttacker(sessionID, i) : state.getDefender(sessionID, i);
            if (entityID == mobileUnitID) {
                if (attackTileID == mobileUnitTileID) {
                    state.setAttacker(sessionID, i, bytes24(0), 0);
                    break;
                } else {
                    state.setDefender(sessionID, i, bytes24(0), 0);
                    break;
                }
            }
        }
    }

    function _requirePlayerOwnedMobileUnit(State state, bytes24 mobileUnit, bytes24 player) private view {
        if (state.getOwner(mobileUnit) != player) {
            revert("MobileUnitNotOwnedByPlayer");
        }
    }

    function _setBagOwner(State state, bytes24 bag, bytes24 entityID) private {
        require(bytes4(bag) == Kind.Bag.selector, "Owner set fail - not a bag node");

        if (bytes4(entityID) == Kind.MobileUnit.selector) {
            state.setOwner(bag, state.getOwner(entityID));
        } else {
            state.setOwner(bag, entityID);
        }
    }

    // -- MATH

    function min(uint64 a, uint64 b) private pure returns (uint64) {
        return a < b ? a : b;
    }

    // function max(int256 a, int256 b) public pure returns (int256) {
    //     return a > b ? a : b;
    // }
}

// CONVERTED FROM SOLIDITY, CODE WILL READ A BIT WEIRD

import { ethers, getUint, keccak256 } from 'ethers';

const BLOCKS_PER_TICK = 1;
const MAX_ENTITIES_PER_SIDE = 100;

export const ATOM_LIFE = 0;
export const ATOM_DEFENSE = 1;
export const ATOM_ATTACK = 2;

enum CombatSideKey {
    ATTACK,
    DEFENCE,
}

export enum CombatActionKind {
    NONE,
    JOIN,
    LEAVE,
    EQUIP,
}

export interface CombatAction {
    kind: CombatActionKind;
    entityID: ethers.BytesLike;
    blockNum: number;
    data: ethers.BytesLike;
}

interface JoinActionInfo {
    combatSide: CombatSideKey;
    stats: [number, number, number];
}

interface LeaveActionInfo {
    combatSide: CombatSideKey;
}

interface CombatState {
    attackerStates: EntityState[];
    defenderStates: EntityState[];
    attackerCount: number;
    defenderCount: number;
    winState: CombatWinState;
    tickCount: number;
}

export interface EntityState {
    entityID: ethers.BytesLike;
    stats: [number, number, number];
    damage: number;
    damageInflicted: number;
    isPresent: boolean;
    isDead: boolean;
    hasClaimed: boolean;
}

interface CombatActionIndex {
    blockNum: number;
    i: number;
    j: number;
}

export enum CombatWinState {
    NONE,
    ATTACKERS,
    DEFENDERS,
    DRAW,
}

export class Combat {
    prevCombatSessionID: number = 0;

    constructor() {
        // Constructor logic here
    }

    calcCombatState(sessionUpdates: CombatAction[][], sortedListIndexes: number[], endBlockNum: number): CombatState {
        const combatState: CombatState = {
            attackerStates: new Array<EntityState>(MAX_ENTITIES_PER_SIDE),
            defenderStates: new Array<EntityState>(MAX_ENTITIES_PER_SIDE),
            attackerCount: 0,
            defenderCount: 0,
            winState: CombatWinState.NONE,
            tickCount: 0,
        };

        for (let x = 0; x < sortedListIndexes.length; x++) {
            const combatAction = sessionUpdates[sortedListIndexes[x] & 0xffff][sortedListIndexes[x] >> 16];

            if (combatAction.blockNum > endBlockNum) {
                return combatState;
            }

            let actionEndBlock =
                x + 1 < sortedListIndexes.length
                    ? sessionUpdates[sortedListIndexes[x + 1] & 0xffff][sortedListIndexes[x + 1] >> 16].blockNum
                    : endBlockNum;

            if (actionEndBlock > endBlockNum) {
                actionEndBlock = endBlockNum;
            }

            if (combatAction.kind === CombatActionKind.JOIN) {
                const result = ethers.AbiCoder.defaultAbiCoder().decode(['uint8', 'uint32[3]'], combatAction.data);
                const info: JoinActionInfo = {
                    combatSide: Number(result[0]),
                    stats: [Number(result[1][0]), Number(result[1][1]), Number(result[1][2])],
                };
                if (
                    info.combatSide === CombatSideKey.ATTACK &&
                    this._addEntityToCombat(combatState.attackerStates, combatAction, info.stats)
                ) {
                    combatState.attackerCount++;
                } else if (this._addEntityToCombat(combatState.defenderStates, combatAction, info.stats)) {
                    combatState.defenderCount++;
                }
            } else if (combatAction.kind === CombatActionKind.LEAVE) {
                const result = ethers.AbiCoder.defaultAbiCoder().decode(['uint8'], combatAction.data);
                const info: LeaveActionInfo = {
                    combatSide: Number(result[0]),
                };

                _removeEntityFromCombat(combatState, combatAction, info);

                if (combatState.attackerCount === 0) {
                    combatState.winState = CombatWinState.DEFENDERS;
                    return combatState;
                } else if (combatState.defenderCount === 0) {
                    combatState.winState = CombatWinState.ATTACKERS;
                    return combatState;
                }
            } else if (combatAction.kind === CombatActionKind.EQUIP) {
                const result = ethers.AbiCoder.defaultAbiCoder().decode(['uint8', 'uint32[3]'], combatAction.data);
                const info: JoinActionInfo = {
                    combatSide: Number(result[0]),
                    stats: [Number(result[1][0]), Number(result[1][1]), Number(result[1][2])],
                };

                _updateEntityStats(combatState, combatAction, info);
            }

            const numTicks = Math.floor((actionEndBlock - combatAction.blockNum) / BLOCKS_PER_TICK);
            for (let t = 0; t < numTicks; t++) {
                // Attackers attack
                this._combatLogic(combatState, CombatSideKey.ATTACK, combatAction.blockNum);
                if (combatState.defenderCount === 0) {
                    combatState.winState = CombatWinState.ATTACKERS;
                    return combatState;
                }

                // Defenders attack
                this._combatLogic(combatState, CombatSideKey.DEFENCE, combatAction.blockNum);
                if (combatState.attackerCount === 0) {
                    combatState.winState = CombatWinState.DEFENDERS;
                    return combatState;
                }

                combatState.tickCount++;
            }
        }

        // There isn't a hard limit on number of ticks at the moment so cannot draw
        // if (combatState.winState === CombatWinState.NONE) {
        //     combatState.winState = CombatWinState.DRAW;
        // }

        return combatState;
    }

    private _combatLogic(combatState: CombatState, combatSide: CombatSideKey, blockNum: number): void {
        const rnd = keccak256(
            ethers.AbiCoder.defaultAbiCoder().encode(['uint64', 'uint16'], [blockNum, combatState.tickCount])
        );
        const attackTotal = this._getAttackTotal(
            combatSide === CombatSideKey.ATTACK ? combatState.attackerStates : combatState.defenderStates
        );
        const enemyRnd = Number(getUint(rnd) & getUint('0xFFFF')); // get first 16bits from rnd
        const enemyState = this._selectPresentEntity(
            combatSide === CombatSideKey.ATTACK ? combatState.defenderStates : combatState.attackerStates,
            enemyRnd % (combatSide === CombatSideKey.ATTACK ? combatState.defenderCount : combatState.attackerCount)
        );

        if (attackTotal > enemyState.stats[ATOM_DEFENSE]) {
            enemyState.damage += attackTotal - enemyState.stats[ATOM_DEFENSE];
        } else {
            enemyState.damage += 1;
        }

        if (enemyState.damage >= enemyState.stats[ATOM_LIFE]) {
            enemyState.isDead = true;
            if (combatSide === CombatSideKey.ATTACK) {
                combatState.defenderCount--;
            } else {
                combatState.attackerCount--;
            }
        }
    }

    private _getAttackTotal(entityStates: EntityState[]): number {
        let totalAttack = 0;
        for (let i = 0; i < entityStates.length; i++) {
            if (entityStates[i] && entityStates[i].isPresent && !entityStates[i].isDead) {
                totalAttack += entityStates[i].stats[ATOM_ATTACK];
                entityStates[i].damageInflicted += entityStates[i].stats[ATOM_ATTACK];
            }
        }

        return totalAttack;
    }

    private _selectPresentEntity(entityStates: EntityState[], entityNum: number): EntityState {
        let entityCount = 0;
        for (let i = 0; i < entityStates.length; i++) {
            if (entityStates[i] && entityStates[i].isPresent && !entityStates[i].isDead) {
                if (entityCount === entityNum) {
                    return entityStates[i];
                }
                entityCount++;
            }
        }

        throw new Error('CombatRule::_selectPresentEntity() EntityNum out of range');
    }

    private _addEntityToCombat(
        entityStates: EntityState[],
        combatAction: CombatAction,
        stats: [number, number, number]
    ): boolean {
        for (let i = 0; i < entityStates.length; i++) {
            if (entityStates[i] && entityStates[i].entityID === combatAction.entityID) {
                if (entityStates[i].isPresent || entityStates[i].isDead) {
                    return false;
                }
                entityStates[i].isPresent = true;
                entityStates[i].stats = stats;
                return true;
            }
            if (!entityStates[i]) {
                entityStates[i] = {
                    entityID: combatAction.entityID,
                    stats: stats,
                    damage: 0,
                    damageInflicted: 0,
                    isPresent: true,
                    isDead: false,
                    hasClaimed: false,
                };
                return true;
            }
        }
        return false;
    }

    public getOrderedListIndexes(sessionUpdates: CombatAction[][]): number[] {
        let totalLength = 0;

        for (let i = 0; i < sessionUpdates.length; i++) {
            totalLength += sessionUpdates[i].length;
        }

        const flattenedIndexes: CombatActionIndex[] = new Array<CombatActionIndex>(totalLength);
        let currentIndex = 0;

        for (let i = 0; i < sessionUpdates.length; i++) {
            for (let j = 0; j < sessionUpdates[i].length; j++) {
                flattenedIndexes[currentIndex] = {
                    blockNum: sessionUpdates[i][j].blockNum,
                    i: i,
                    j: j,
                };
                currentIndex++;
            }
        }

        for (let i = 0; i < flattenedIndexes.length - 1; i++) {
            for (let j = i + 1; j < flattenedIndexes.length; j++) {
                if (flattenedIndexes[i].blockNum > flattenedIndexes[j].blockNum) {
                    const temp = flattenedIndexes[i];
                    flattenedIndexes[i] = flattenedIndexes[j];
                    flattenedIndexes[j] = temp;
                }
            }
        }

        const indexes: number[] = new Array<number>(flattenedIndexes.length);
        for (let i = 0; i < flattenedIndexes.length; i++) {
            indexes[i] = flattenedIndexes[i].i | (flattenedIndexes[i].j << 16);
        }

        return indexes;
    }
}
function _removeEntityFromCombat(combatState: CombatState, combatAction: CombatAction, info: LeaveActionInfo) {
    const entityStates =
        info.combatSide === CombatSideKey.ATTACK ? combatState.attackerStates : combatState.defenderStates;

    for (let i = 0; i < entityStates.length; i++) {
        if (entityStates[i] && entityStates[i].entityID == combatAction.entityID && entityStates[i].isPresent) {
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
function _updateEntityStats(combatState: CombatState, combatAction: CombatAction, info: JoinActionInfo) {
    const entityStates =
        info.combatSide === CombatSideKey.ATTACK ? combatState.attackerStates : combatState.defenderStates;

    for (let i = 0; i < entityStates.length; i++) {
        if (entityStates[i] && entityStates[i].entityID == combatAction.entityID) {
            if (!entityStates[i].isPresent) {
                return;
            }

            entityStates[i].stats = info.stats;
            break;
        }
    }
}

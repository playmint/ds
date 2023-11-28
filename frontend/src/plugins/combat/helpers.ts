import { formatNameOrId, getItemStructure } from '@app/helpers';
import {
    ATOM_ATTACK,
    ATOM_DEFENSE,
    ATOM_LIFE,
    ATOM_POWER,
    CombatAction,
    EntityState,
} from '@app/plugins/combat/combat';
import { CombatParticipantProps } from '@app/plugins/combat/combat-participant';
import {
    BuildingKindFragment,
    ConnectedPlayer,
    ItemSlotFragment,
    WorldMobileUnitFragment,
    WorldStateFragment,
    WorldTileFragment,
} from '@downstream/core';
import { BagFragment, WorldCombatSessionFragment } from '@downstream/core/src/gql/graphql';
import {
    getBagsAtEquipee,
    getBuildingAtTile,
    getMobileUnitsAtTile,
    getSessionsAtTile,
} from '@downstream/core/src/utils';
import { AbiCoder, BigNumberish, BytesLike, hexlify } from 'ethers';

export const NUM_STAT_KINDS = 3; // LIFE, DEFENCE, ATTACK
export const UNIT_BASE_LIFE = 50;
export const UNIT_BASE_DEFENCE = 23;
export const UNIT_BASE_ATTACK = 30;
export const UNIT_BASE_POWER = 3;
export const LIFE_MUL = 10;

export const buildingIdStart = '0x34cf8a7e';

export const nodeKindMask = BigInt('0xffffffff');
export const buildingNodeKind = BigInt('0x34cf8a7e');

export type CombatSession = WorldCombatSessionFragment;

// NOTE: I wasn't able to import this from core as the namespace wasn't exported. Not sure how to fix
export type CombatActionStruct = {
    kind: BigNumberish;
    entityID: BytesLike;
    blockNum: BigNumberish;
    data: BytesLike;
};

export function getActionsFlat(session: CombatSession): CombatActionStruct[] {
    // A sessionUpdate is an array of actions
    const sessionUpdates = session.sessionUpdates.map((actionUpdate) => {
        if (!actionUpdate) return null;

        const binaryString = atob(actionUpdate.value);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const decoder = AbiCoder.defaultAbiCoder();
        // TODO: I'm not sure why the decoder is putting my array of tuples in a one element array.
        //       Bad feelin this'll bite me later
        //
        // NOTE: The tuple is actually a struct
        // struct CombatAction {
        //     CombatActionKind kind;
        //     bytes24 entityID; // Can be mobileUnit or building
        //     uint64 blockNum;
        //     bytes data;
        // }
        return decoder.decode(['tuple(uint8,bytes24,uint64,bytes)[]'], bytes)[0];
    });
    const actions = sessionUpdates.flatMap((actionTuples): CombatActionStruct => {
        // Turn the tuples back into structs
        return actionTuples.map((actionTuple: any) => {
            const [actionKind, entityID, blockNum, data] = actionTuple;
            return {
                actionKind,
                entityID,
                blockNum,
                data,
            };
        });
    });
    return actions;
}

export function getActions(session: CombatSession) {
    // A sessionUpdate is an array of actions
    const sessionUpdates = session.sessionUpdates
        .sort((a, b) => {
            if (!a || !b) return 0;
            const actionNumA = BigInt(a.name.split('-')[1]);
            const actionNumB = BigInt(b.name.split('-')[1]);
            return Number(actionNumA - actionNumB);
        })
        .map((actionUpdate) => {
            if (!actionUpdate) return null;

            const binaryString = atob(actionUpdate.value);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            const decoder = AbiCoder.defaultAbiCoder();
            return decoder.decode(['tuple(uint8,bytes24,uint64,bytes)[]'], bytes)[0];
        });
    const actions = sessionUpdates.map((actionTuples): CombatActionStruct[] => {
        // Turn the tuples back into structs
        return actionTuples.map((actionTuple: any): CombatActionStruct => {
            const [kind, entityID, blockNum, data] = actionTuple;
            return {
                kind,
                entityID,
                blockNum,
                data,
            };
        });
    });
    return actions;
}

export function convertCombatActions(actions: CombatActionStruct[][]): CombatAction[][] {
    const convertedActions: CombatAction[][] = [];
    for (let i = 0; i < actions.length; i++) {
        const row: CombatAction[] = [];
        for (let j = 0; j < actions[i].length; j++) {
            const actionStruct = actions[i][j];

            const convertedAction: CombatAction = {
                kind: Number(actionStruct.kind),
                entityID: actionStruct.entityID,
                blockNum: Number(actionStruct.blockNum),
                data: actionStruct.data,
            };

            row.push(convertedAction);
        }
        convertedActions.push(row);
    }
    return convertedActions;
}

export const getIcon = (entityID: BytesLike, mobileUnits: WorldMobileUnitFragment[]) => {
    const id = hexlify(entityID);
    if (id.startsWith(buildingIdStart)) {
        return '/building-tower.png';
    }
    const mobileUnit = mobileUnits.find((s) => s.id === id);
    return mobileUnit ? '/icons/mobile-unit-yours.svg' : '/icons/mobile-unit-theirs.svg';
};

export const getEntityName = (entityID: BytesLike, world: WorldStateFragment) => {
    const id = hexlify(entityID).toString();
    if (id.startsWith(buildingIdStart)) {
        const building = world.buildings.find((b) => b.id === id);
        return building?.kind?.name?.value ?? 'Building';
    }
    const unit = (world?.mobileUnits || []).find((s) => s.id === entityID);
    return formatNameOrId(unit, 'Unit ');
};

export const getEquipmentStats = (bags: BagFragment[]): [number, number, number, number] => {
    const stats = bags.reduce(
        (stats, bag) => {
            bag.slots.forEach((slot) => {
                if (slot.balance > 0) {
                    const [stackable, life, defense, attack, power] = getItemStructure(slot.item.id);
                    if (!stackable) {
                        stats[ATOM_LIFE] += life * LIFE_MUL;
                        stats[ATOM_DEFENSE] += defense;
                        stats[ATOM_ATTACK] += attack;
                        stats[ATOM_POWER] += power;
                    }
                }
            });
            return stats;
        },
        [0, 0, 0, 0] as [number, number, number, number]
    );
    return stats;
};

export const getMobileUnitStats = (mobileUnit?: WorldMobileUnitFragment, worldBags?: BagFragment[]): number[] => {
    if (mobileUnit === undefined || worldBags === undefined) return [0, 0, 0];

    const mobileUnitBags = getBagsAtEquipee(worldBags, mobileUnit);
    const stats = getEquipmentStats(mobileUnitBags);

    stats[ATOM_LIFE] += UNIT_BASE_LIFE * LIFE_MUL;
    stats[ATOM_DEFENSE] += UNIT_BASE_DEFENCE;
    stats[ATOM_ATTACK] += UNIT_BASE_ATTACK;
    stats[ATOM_POWER] += UNIT_BASE_POWER;

    return stats;
};

export const getMaterialStats = (materials: ItemSlotFragment[]) => {
    return materials.reduce(
        (stats, { item, balance }) => {
            if (balance > 0) {
                const [_, life, defense, attack] = getItemStructure(item.id);
                stats[ATOM_LIFE] += life * balance;
                stats[ATOM_DEFENSE] += defense * balance;
                stats[ATOM_ATTACK] += attack * balance;
            }
            return stats;
        },
        [0, 0, 0]
    );
};

export const unitToCombatParticipantProps = (
    unit: WorldMobileUnitFragment,
    world: WorldStateFragment,
    player: ConnectedPlayer
) => {
    const entityID = unit.id;
    const unitBags = getBagsAtEquipee(world?.bags || [], unit);
    const playerMobileUnits = (world?.mobileUnits || []).filter((mu) => mu.owner?.id == player.id);
    const stats = getEquipmentStats(unitBags);
    return {
        name: getEntityName(entityID, world),
        icon: getIcon(entityID, playerMobileUnits),
        maxHealth: stats[ATOM_LIFE] + UNIT_BASE_LIFE * LIFE_MUL,
        currentHealth: stats[ATOM_LIFE] + UNIT_BASE_LIFE * LIFE_MUL,
        attack: stats[ATOM_ATTACK] + UNIT_BASE_ATTACK,
        defence: stats[ATOM_DEFENSE] + UNIT_BASE_DEFENCE,
        isDead: false,
        isPresent: true,
    };
};

export const buildingToCombatParticipantProps = (buildingKind: BuildingKindFragment) => {
    const stats = getMaterialStats(buildingKind.materials);
    return {
        name: `${buildingKind.name?.value ?? 'Building'}`,
        icon: '/building-tower.png',
        maxHealth: stats[ATOM_LIFE] * LIFE_MUL,
        currentHealth: stats[ATOM_LIFE] * LIFE_MUL,
        attack: stats[ATOM_ATTACK],
        defence: stats[ATOM_DEFENSE],
        isDead: false,
        isPresent: true,
    };
};

export const entityStateToCombatParticipantProps = (
    { entityID, damage, stats, isDead, isPresent }: EntityState,
    world: WorldStateFragment,
    player: ConnectedPlayer
) => {
    const playerMobileUnits = (world?.mobileUnits || []).filter((mu) => mu.owner?.id == player.id);
    return {
        name: getEntityName(entityID, world),
        icon: getIcon(entityID, playerMobileUnits),
        maxHealth: stats[ATOM_LIFE],
        currentHealth: Math.max(stats[ATOM_LIFE] - damage, 0),
        attack: stats[ATOM_ATTACK],
        defence: stats[ATOM_DEFENSE],
        isDead,
        isPresent,
    };
};

export const sumParticipants = (
    [participantsMaxHealth, participantsCurrentHealth]: number[],
    { maxHealth, currentHealth, isPresent }: CombatParticipantProps
) => {
    return isPresent
        ? [participantsMaxHealth + maxHealth, participantsCurrentHealth + currentHealth]
        : [participantsMaxHealth, participantsCurrentHealth];
};

export const getTileEntities = (
    tile: WorldTileFragment,
    world: WorldStateFragment,
    player: ConnectedPlayer
): CombatParticipantProps[] => {
    if (!tile) {
        return [];
    }
    const entities: CombatParticipantProps[] = [];
    const building = getBuildingAtTile(world?.buildings || [], tile);
    if (building && building.kind) {
        entities.push(buildingToCombatParticipantProps(building.kind));
    }
    const mobileUnits = getMobileUnitsAtTile(world?.mobileUnits || [], tile);
    entities.push(...mobileUnits.map((unit) => unitToCombatParticipantProps(unit, world, player)));
    return entities;
};

export const getLatestCombatSession = (sessions: WorldCombatSessionFragment[], tile: WorldTileFragment) => {
    const tileSessions = getSessionsAtTile(sessions, tile);
    return tileSessions.length > 0
        ? tileSessions.sort((a, b) => {
              return a.attackTile && b.attackTile ? b.attackTile.startBlock - a.attackTile.startBlock : 0;
          })[0]
        : undefined;
};

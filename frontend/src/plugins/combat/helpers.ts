import {
    BuildingKindFragment,
    ConnectedPlayer,
    EquipmentSlotFragment,
    ItemSlotFragment,
    SelectedSeekerFragment,
    SelectedTileFragment,
    WorldBuildingFragment,
    WorldSeekerFragment,
    WorldStateFragment,
    WorldTileFragment
} from '@dawnseekers/core';
import { AbiCoder, BigNumberish, BytesLike, hexlify } from 'ethers';
import { ATOM_ATTACK, ATOM_DEFENSE, ATOM_LIFE, CombatAction, EntityState } from '@app/plugins/combat/combat';
import { formatUnitKey } from '@app/helpers';
import { CombatParticipantProps } from '@app/plugins/combat/combat-participant';

export const UNIT_BASE_LIFE = 50;
export const UNIT_BASE_DEFENCE = 23;
export const UNIT_BASE_ATTACK = 30;

export const buildingIdStart = '0x34cf8a7e';

export const nodeKindMask = BigInt('0xffffffff');
export const buildingNodeKind = BigInt('0x34cf8a7e');

export type CombatSession = WorldTileFragment['sessions'][number];

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
        //     bytes24 entityID; // Can be seeker or building
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
                data
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
                data
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
                data: actionStruct.data
            };

            row.push(convertedAction);
        }
        convertedActions.push(row);
    }
    return convertedActions;
}

export const getIcon = (entityID: BytesLike, seekers: WorldSeekerFragment[]) => {
    const id = hexlify(entityID);
    if (id.startsWith(buildingIdStart)) {
        return '/building-tower.png';
    }
    const seeker = seekers.find((s) => s.id === id);
    return seeker ? '/seeker-yours.png' : '/seeker-theirs.png';
};

export const getEntityName = (entityID: BytesLike, buildings: WorldBuildingFragment[]) => {
    const id = hexlify(entityID).toString();
    if (id.startsWith(buildingIdStart)) {
        const building = buildings.find((b) => b.id === id);
        return building?.kind?.name?.value ?? 'Building';
    }
    return `Unit #${formatUnitKey(hexlify(entityID))}`;
};

export const getItemStats = (itemId: string) => {
    return [...itemId]
        .slice(2)
        .reduce((bs, b, idx) => {
            if (idx % 8 === 0) {
                bs.push('0x');
            }
            bs[bs.length - 1] += b;
            return bs;
        }, [] as string[])
        .map((n: string) => Number(BigInt(n)))
        .slice(-4);
};

export const getEquipmentStats = (equipmentSlots: EquipmentSlotFragment[]) => {
    return equipmentSlots.reduce(
        (stats, { bag }) => {
            bag.slots.forEach((slot) => {
                if (slot.balance > 0) {
                    const [stackable, life, defense, attack] = getItemStats(slot.item.id);
                    if (!stackable) {
                        stats[ATOM_LIFE] += life;
                        stats[ATOM_DEFENSE] += defense;
                        stats[ATOM_ATTACK] += attack;
                    }
                }
            });
            return stats;
        },
        [0, 0, 0]
    );
};

export const getMaterialStats = (materials: ItemSlotFragment[]) => {
    return materials.reduce(
        (stats, { item, balance }) => {
            if (balance > 0) {
                const [_, life, defense, attack] = getItemStats(item.id);
                stats[ATOM_LIFE] += life * balance;
                stats[ATOM_DEFENSE] += defense * balance;
                stats[ATOM_ATTACK] += attack * balance;
            }
            return stats;
        },
        [0, 0, 0]
    );
};

export const unitToCombatParticipantProps = (unit: SelectedSeekerFragment, seekers: WorldSeekerFragment[]) => {
    const entityID = unit.id;
    const stats = getEquipmentStats(unit.bags);
    return {
        name: `Unit #${formatUnitKey(entityID)}`,
        icon: getIcon(entityID, seekers),
        maxHealth: stats[ATOM_LIFE] + UNIT_BASE_LIFE,
        currentHealth: stats[ATOM_LIFE] + UNIT_BASE_LIFE,
        attack: stats[ATOM_ATTACK] + UNIT_BASE_ATTACK,
        defence: stats[ATOM_DEFENSE] + UNIT_BASE_DEFENCE,
        isDead: false,
        isPresent: true
    };
};

export const buildingToCombatParticipantProps = (buildingKind: BuildingKindFragment) => {
    const stats = getMaterialStats(buildingKind.materials);
    return {
        name: `${buildingKind.name?.value ?? 'Building'}`,
        icon: '/building-tower.png',
        maxHealth: stats[ATOM_LIFE],
        currentHealth: stats[ATOM_LIFE],
        attack: stats[ATOM_ATTACK],
        defence: stats[ATOM_DEFENSE],
        isDead: false,
        isPresent: true
    };
};

export const entityStateToCombatParticipantProps = (
    { entityID, damage, stats, isDead, isPresent }: EntityState,
    { buildings }: WorldStateFragment,
    { seekers }: ConnectedPlayer
) => ({
    name: getEntityName(entityID, buildings),
    icon: getIcon(entityID, seekers),
    maxHealth: stats[ATOM_LIFE],
    currentHealth: Math.max(stats[ATOM_LIFE] - damage, 0),
    attack: stats[ATOM_ATTACK],
    defence: stats[ATOM_DEFENSE],
    isDead,
    isPresent
});

export const sumParticipants = (
    [participantsMaxHealth, participantsCurrentHealth]: number[],
    { maxHealth, currentHealth, isPresent }: CombatParticipantProps
) => {
    return isPresent
        ? [participantsMaxHealth + maxHealth, participantsCurrentHealth + currentHealth]
        : [participantsMaxHealth, participantsCurrentHealth];
};

export const getTileEntities = (tile: SelectedTileFragment, player: ConnectedPlayer): CombatParticipantProps[] => {
    if (!tile) {
        return [];
    }
    const entities = [];
    if (tile.building && tile.building.kind) {
        entities.push(buildingToCombatParticipantProps(tile.building.kind));
    }
    entities.push(...tile.seekers.map((unit) => unitToCombatParticipantProps(unit, player.seekers)));
    return entities;
};

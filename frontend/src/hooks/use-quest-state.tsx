import { Log, QUEST_STATUS_ACCEPTED, QUEST_STATUS_COMPLETED, QuestFragment, TaskKinds } from '@downstream/core';
import { Dispatch, ReactNode, SetStateAction, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useBuildingKinds, useGameState, usePlayer, useQuestMessages } from './use-game-state';
import { id as keccak256UTF8 } from 'ethers';
import {
    BagFragment,
    BuildingKindFragment,
    QuestTaskFragment,
    WorldBuildingFragment,
    WorldCombatSessionFragment,
    WorldMobileUnitFragment,
    WorldTileFragment,
} from '@downstream/core/src/gql/graphql';
import { getCoords, getTileDistance } from '@app/helpers/tile';
import { getBagsAtEquipee, getBuildingAtTile, getSessionsAtTile } from '@downstream/core/src/utils';
import {
    convertCombatActions,
    getActions,
    LIFE_MUL,
    UNIT_BASE_ATTACK,
    UNIT_BASE_DEFENCE,
    UNIT_BASE_LIFE,
    NUM_STAT_KINDS,
    getEquipmentStats,
} from '@app/plugins/combat/helpers';
import { Combat, CombatWinState, EntityState } from '@app/plugins/combat/combat';
import { ATOM_LIFE, ATOM_ATTACK, ATOM_DEFENSE } from '@app/plugins/combat/combat';

// TODO: Generate these
const taskCoord = '0x' + BigInt.asUintN(32, BigInt(keccak256UTF8(TaskKinds.coord))).toString(16);
const taskMessage = '0x' + BigInt.asUintN(32, BigInt(keccak256UTF8(TaskKinds.message))).toString(16);
const taskInventory = '0x' + BigInt.asUintN(32, BigInt(keccak256UTF8(TaskKinds.inventory))).toString(16);
const taskQuestAccept = '0x' + BigInt.asUintN(32, BigInt(keccak256UTF8(TaskKinds.questAccept))).toString(16);
const taskQuestComplete = '0x' + BigInt.asUintN(32, BigInt(keccak256UTF8(TaskKinds.questComplete))).toString(16);
const taskCombat = '0x' + BigInt.asUintN(32, BigInt(keccak256UTF8(TaskKinds.combat))).toString(16);
const taskConstruct = '0x' + BigInt.asUintN(32, BigInt(keccak256UTF8(TaskKinds.construct))).toString(16);
const taskDeployBuilding = '0x' + BigInt.asUintN(32, BigInt(keccak256UTF8(TaskKinds.deployBuilding))).toString(16);
const taskUnitStats = '0x' + BigInt.asUintN(32, BigInt(keccak256UTF8(TaskKinds.unitStats))).toString(16);

export interface QuestContextValue {
    taskCounter: number;
    setTaskCounter: Dispatch<SetStateAction<number>>;

    acceptedQuests: Quest[];
}

export type Quest = {
    id: string;
    key: number;
    name: string;
    location?: ReturnType<typeof getCoords>;
    description: string;
    tasks: Task[];
};

export type Task = {
    name: string;
    isCompleted: boolean;
};

export type QuestContextStore = Partial<QuestContextValue>;

export const QuestContext = createContext({} as QuestContextStore);

export const useQuestState = () => useContext(QuestContext);

export const QuestStateProvider = ({ children }: { children: ReactNode }) => {
    const player = usePlayer();
    const questMessages = useQuestMessages(10);
    const { world, tiles } = useGameState();
    const buildingKinds = useBuildingKinds();
    const [taskCounter, setTaskCounter] = useState(0);
    const [questFrags, setQuests] = useState<QuestFragment[]>([]);
    const [acceptedQuests, setAcceptedQuests] = useState<Quest[]>([]);
    const [questUpdateTimoutId, setQuestUpdateTimeoutId] = useState<any>();

    const acceptedQuestFrags = useMemo(() => {
        return questFrags.filter((q) => q.status == QUEST_STATUS_ACCEPTED).sort((a, b) => a.key - b.key) || [];
    }, [questFrags]);

    useEffect(() => {
        if (!player) return;
        setQuests(player.quests);
    }, [player]);

    useEffect(() => {
        if (questUpdateTimoutId === undefined) return;

        return () => {
            clearTimeout(questUpdateTimoutId);
        };
    }, [questUpdateTimoutId]);

    // Process all the quests to calculate completion
    useEffect(() => {
        if (!tiles) return;
        if (!player) return;
        if (!world?.buildings) return;
        if (!buildingKinds) return;

        const makeQuestObjects = () => {
            console.log('Making quest objects');
            const playerUnits =
                world?.mobileUnits.filter((mu) => mu.owner && player && mu.owner.id === player.id) || [];
            const combatSessions = world?.sessions || [];

            const acceptedQuests = acceptedQuestFrags.map((q): Quest => {
                const tasks = q.node.tasks
                    .sort((a, b) => a.key - b.key)
                    .map((task): Task => {
                        const taskKind = task.node.keys[0];

                        return {
                            name: task.node.name?.value || '',
                            isCompleted: getTaskCompletion(
                                questFrags,
                                task.node,
                                taskKind,
                                player.id,
                                playerUnits,
                                tiles,
                                combatSessions,
                                world.buildings,
                                world.bags,
                                buildingKinds,
                                questMessages
                            ),
                        };
                    });

                return {
                    id: q.node.id,
                    key: q.key,
                    location: (q.node.location && getCoords(q.node.location)) || undefined,
                    name: q.node.name?.value || 'Unknown',
                    description: q.node.description?.value || '',
                    tasks,
                };
            });
            setAcceptedQuests(acceptedQuests);
        };

        // debounce
        setQuestUpdateTimeoutId(setTimeout(makeQuestObjects, 500));
    }, [
        questFrags,
        acceptedQuestFrags,
        player,
        questMessages,
        tiles,
        world?.mobileUnits,
        world?.sessions,
        world?.buildings,
        world?.bags,
        buildingKinds,
    ]);

    const value = {
        taskCounter,
        setTaskCounter,

        acceptedQuests,
    };

    return <QuestContext.Provider value={value}>{children}</QuestContext.Provider>;
};

export const getTaskCompletion = (
    questFrags: QuestFragment[],
    taskFrag: QuestTaskFragment,
    taskKind: string,
    playerID: string,
    playerUnits: WorldMobileUnitFragment[],
    tiles: WorldTileFragment[],
    combatSessions: WorldCombatSessionFragment[],
    buildings: WorldBuildingFragment[],
    bags: BagFragment[],
    buildingKinds: BuildingKindFragment[],
    questMessages?: Log[]
): boolean => {
    switch (taskKind) {
        case taskCoord:
            return evalTaskCoord(taskFrag, playerUnits);

        case taskMessage:
            return evalTaskMessage(taskFrag, questMessages);

        case taskConstruct:
            return evalTaskConstruct(taskFrag, playerID, tiles, buildings);

        case taskDeployBuilding:
            return evalTaskDeployBuilding(playerID, buildingKinds);

        case taskInventory:
            return evalTaskInventory(taskFrag, playerUnits, bags);

        case taskUnitStats:
            return evalTaskUnitStats(taskFrag, playerUnits, bags);

        case taskQuestAccept:
            return evalTaskQuestAccept(taskFrag, questFrags);

        case taskQuestComplete:
            return evalTaskQuestComplete(taskFrag, questFrags);

        case taskCombat:
            return evalTaskCombat(taskFrag, playerUnits, tiles, combatSessions);

        default:
            return false;
    }
};

// -- Task evals
export const evalTaskQuestComplete = (task: QuestTaskFragment, quests: QuestFragment[]) => {
    return quests.some((q) => q.node.id == task.quest?.id && q.status == QUEST_STATUS_COMPLETED);
};

export const evalTaskQuestAccept = (task: QuestTaskFragment, quests: QuestFragment[]) => {
    return quests.some((q) => q.node.id == task.quest?.id);
};

export const evalTaskDeployBuilding = (
    task: QuestTaskFragment,
    playerID: string,
    buildingKinds: BuildingKindFragment[]
) => {
    return buildingKinds.some((b) => {
        const requiredInput = task.craftItems.find((i) => i.key === 0);
        const craftInputRequired = requiredInput ? requiredInput.item.id : undefined;
        const requiredOutput = task.craftItems.find((i) => i.key === 1);
        const craftOutputRequired = requiredOutput ? requiredOutput.item.id : undefined;
        return (
            b.owner?.id == playerID &&
            (!craftInputRequired || b.inputs.some((i) => i?.item?.id == craftInputRequired)) &&
            (!craftOutputRequired || b.outputs.some((i) => i?.item?.id == craftOutputRequired))
        );
    });
};

export const evalTaskConstruct = (
    task: QuestTaskFragment,
    playerID: string,
    tiles: WorldTileFragment[],
    buildings: WorldBuildingFragment[]
) => {
    return tiles.some((t) => {
        const building = getBuildingAtTile(buildings, t);
        return (
            building?.owner?.id == playerID && (task.buildingKind ? building?.kind?.id == task.buildingKind.id : true)
        );
    });
};

export const evalTaskMessage = (task: QuestTaskFragment, questMessages?: Log[]) => {
    if (!questMessages) return false;

    const pluginMessages =
        (task.buildingKind &&
            questMessages &&
            questMessages.filter((m) => m.name === `questMessages: ${task.buildingKind?.id}`)) ||
        [];
    return pluginMessages.some((m) => m.text == task.message?.value);
};

export const evalTaskCoord = (task: QuestTaskFragment, playerUnits: WorldMobileUnitFragment[]) => {
    return playerUnits.some((unit) => {
        return unit.nextLocation && task.location && getTileDistance(unit.nextLocation.tile, task.location) < 2;
    });
};

export const evalTaskUnitStats = (
    task: QuestTaskFragment,
    playerUnits: WorldMobileUnitFragment[],
    bags: BagFragment[]
) => {
    return (
        task.unitStats.length === NUM_STAT_KINDS &&
        playerUnits.some((m) => {
            const unitBags = getBagsAtEquipee(bags, m);
            const stats = getEquipmentStats(unitBags);
            stats[ATOM_LIFE] += UNIT_BASE_LIFE * LIFE_MUL;
            stats[ATOM_DEFENSE] += UNIT_BASE_DEFENCE;
            stats[ATOM_ATTACK] += UNIT_BASE_ATTACK;

            // All unit's stats must be greater than or equal to the stats defined in the task
            return task.unitStats.every(
                (statEdge) => statEdge.key < NUM_STAT_KINDS && stats[statEdge.key] >= statEdge.weight
            );
        })
    );
};

export const evalTaskInventory = (
    task: QuestTaskFragment,
    playerUnits: WorldMobileUnitFragment[],
    bags: BagFragment[]
) => {
    const taskItemSlot = task.itemSlot;
    if (!taskItemSlot) return false;

    const itemCount =
        playerUnits.reduce((playerTotal, unit) => {
            const unitBags = getBagsAtEquipee(bags, unit);
            if (unitBags.length === 0) return playerTotal;
            return (
                playerTotal +
                unitBags.reduce((bagTotal, bag) => {
                    return (
                        bagTotal +
                        bag.slots.reduce((slotTotal, itemSlot) => {
                            return itemSlot.item.id == taskItemSlot.item.id ? slotTotal + itemSlot.balance : slotTotal;
                        }, 0)
                    );
                }, 0)
            );
        }, 0) || 0;
    return itemCount >= taskItemSlot.balance;
};

export const evalTaskCombat = (
    task: QuestTaskFragment,
    mobileUnits: WorldMobileUnitFragment[],
    tiles: WorldTileFragment[],
    combatSessions: WorldCombatSessionFragment[]
) => {
    const ATTACK_WIN = 0;

    return tiles.some((tile) => {
        return getSessionsAtTile(combatSessions, tile).some((s) => {
            if (!s.isFinalised) return false;

            // TODO: WARN: This will not scale as it's searching through every combat that has ever happened looking for the player's unit.
            const actions = getActions(s);
            const convertedActions = convertCombatActions(actions);
            const combat = new Combat(); // Is a class because it was converted from solidity
            const orderedListIndexes = combat.getOrderedListIndexes(convertedActions);

            // Because we only care about finalised tasks, the block number isn't important and can be some way off in the future one
            const combatState = combat.calcCombatState(convertedActions, orderedListIndexes, Number.MAX_SAFE_INTEGER);

            let winnerStates: EntityState[];
            if (task.combatState?.value == ATTACK_WIN) {
                if (combatState.winState != CombatWinState.ATTACKERS) return false;

                winnerStates = combatState.attackerStates;
            } else {
                if (combatState.winState != CombatWinState.DEFENDERS) return false;

                winnerStates = combatState.attackerStates;
            }

            // We don't care if the player's unit died, they just needed to have not left the battle
            return winnerStates.some(
                (participant) => participant.isPresent && mobileUnits.some((u) => u.id == participant.entityID)
            );
        });
    });
};

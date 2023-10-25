import { QUEST_STATUS_ACCEPTED, QuestFragment, TaskKinds } from '@downstream/core';
import { Dispatch, ReactNode, SetStateAction, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useGameState, usePlayer, useQuestMessages } from './use-game-state';
import { id as keccak256UTF8 } from 'ethers';
import { QuestTaskFragment } from '@downstream/core/src/gql/graphql';
import { Coords, getCoords, getTileDistance } from '@app/helpers/tile';

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
    const [taskCounter, setTaskCounter] = useState(0);
    const [questFrags, setQuests] = useState<QuestFragment[]>([]);
    const [acceptedQuests, setAcceptedQuests] = useState<Quest[]>([]);

    const acceptedQuestFrags = useMemo(() => {
        return questFrags.filter((q) => q.status == QUEST_STATUS_ACCEPTED).sort((a, b) => a.key - b.key) || [];
    }, [questFrags]);

    useEffect(() => {
        if (!player) return;
        setQuests(player.quests);
    }, [player]);

    // Process all the quests to calculate completion
    useEffect(() => {
        const acceptedQuests = acceptedQuestFrags.map((q): Quest => {
            const tasks = q.node.tasks
                .sort((a, b) => a.key - b.key)
                .map((task): Task => {
                    const taskKind = task.node.keys[0];
                    const playerUnits =
                        world?.mobileUnits.filter((mu) => mu.owner && player && mu.owner.id === player.id) || [];

                    switch (taskKind) {
                        case taskCoord: {
                            const isCompleted = playerUnits.some((unit) => {
                                return (
                                    unit.nextLocation &&
                                    task.node.location &&
                                    getTileDistance(unit.nextLocation.tile, task.node.location) < 2
                                );
                            });
                            return { name: task.node.name?.value || '', isCompleted };
                        }

                        case taskMessage: {
                            const pluginMessages =
                                (task.node.buildingKind &&
                                    questMessages &&
                                    questMessages.filter(
                                        (m) => m.name === `questMessages: ${task.node.buildingKind?.id}`
                                    )) ||
                                [];
                            const isCompleted = pluginMessages.some((m) => m.text == task.node.message?.value);
                            return { name: task.node.name?.value || '', isCompleted };
                        }

                        default:
                            return { name: task.node.name?.value || '', isCompleted: false };
                    }
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
    }, [acceptedQuestFrags, player, questMessages, world?.mobileUnits]);

    const value = {
        taskCounter,
        setTaskCounter,

        acceptedQuests,
    };

    return <QuestContext.Provider value={value}>{children}</QuestContext.Provider>;
};

import { ConnectedPlayer, Log, Player, QuestFragment, TaskKinds } from '@app/../../core/src';
import styled from 'styled-components';
import { FunctionComponent, useEffect } from 'react';
import { Locatable, getCoords, getTileDistance } from '@app/helpers/tile';
import { id as keccak256UTF8 } from 'ethers';
import { useQuestMessages } from '@app/hooks/use-game-state';

const Panel = styled.div`
    background: #143063;
    color: #fff;
    padding: 2rem 2rem;
    margin-bottom: 1.2rem;
    width: 52rem;

    > h1 {
        text-align: center;
        margin-bottom: 1rem;
    }

    > .taskContainer {
        margin-top: 1rem;
    }

    > .buttonContainer {
        margin-top: 1rem;
        display: flex;
        justify-content: center;
    }

    > .buttonContainer .completeQuestButton {
        width: 30rem;
    }
`;

export interface QuestProps {
    player: ConnectedPlayer;
}

export const QUEST_ACCEPTED = 1;
export const QUEST_COMPLETED = 2;

// TODO: Generate these
export const taskCoord = '0x' + BigInt.asUintN(32, BigInt(keccak256UTF8(TaskKinds.coord))).toString(16);
export const taskMessage = '0x' + BigInt.asUintN(32, BigInt(keccak256UTF8(TaskKinds.message))).toString(16);
export const taskInventory = '0x' + BigInt.asUintN(32, BigInt(keccak256UTF8(TaskKinds.inventory))).toString(16);
export const taskCombat = '0x' + BigInt.asUintN(32, BigInt(keccak256UTF8(TaskKinds.combat))).toString(16);
export const taskCombatWinAttack =
    '0x' + BigInt.asUintN(32, BigInt(keccak256UTF8(TaskKinds.combatWinAttack))).toString(16);
export const taskCombatWinDefense =
    '0x' + BigInt.asUintN(32, BigInt(keccak256UTF8(TaskKinds.combatWinDefense))).toString(16);
export const taskQuestAccept = '0x' + BigInt.asUintN(32, BigInt(keccak256UTF8(TaskKinds.questAccept))).toString(16);
export const taskQuestComplete = '0x' + BigInt.asUintN(32, BigInt(keccak256UTF8(TaskKinds.questComplete))).toString(16);

type Task = QuestFragment['node']['tasks'][0] & Partial<{ isCompleted: boolean }>;

const TaskItem: FunctionComponent<{ task: Task }> = ({ task }) => {
    return (
        <p>
            {task.isCompleted ? '[X]' : '[ ]'} {task.node.name?.value}
        </p>
    );
};
const LocationButton: FunctionComponent<{ location: Locatable }> = ({ location }) => {
    const { q, r, s } = getCoords(location);
    return <p>{`${q} ${r} ${s}`}</p>;
};

// TODO: Make each of these task evaluations a memo
const evalTaskCompletion = (task: Task, player: Player, questMessages?: Log[]) => {
    // console.log('evalTaskCompletion');
    switch (task.node.keys[0]) {
        case taskCoord:
            return player.mobileUnits?.some((unit) => {
                return (
                    unit.nextLocation &&
                    task.node.location &&
                    getTileDistance(unit.nextLocation.tile, task.node.location) < 2
                );
            });

        case taskInventory: {
            if (!task.node.itemSlot) {
                return false;
            }
            const taskItemSlot = task.node.itemSlot;
            const itemCount =
                player.mobileUnits?.reduce((playerTotal, unit) => {
                    return (
                        playerTotal +
                        unit.bags.reduce((bagTotal, bagSlot) => {
                            return (
                                bagTotal +
                                bagSlot.bag.slots.reduce((slotTotal, itemSlot) => {
                                    return itemSlot.item.id == taskItemSlot.item.id
                                        ? slotTotal + itemSlot.balance
                                        : slotTotal;
                                }, 0)
                            );
                        }, 0)
                    );
                }, 0) || 0;
            return itemCount >= taskItemSlot.balance;
        }

        case taskMessage: {
            if (!task.node.buildingKind) return false;
            if (!questMessages) return false;

            console.log(`buildingKindID: ${task.node.buildingKind?.id}`);
            const pluginMessages = questMessages.filter(
                (m) => m.name === `questMessages: ${task.node.buildingKind?.id}`
            );
            return pluginMessages.some((m) => m.text == task.node.message?.value);
        }

        case taskQuestAccept: {
            // passes if the quest is either accepted or completed
            return player.quests?.some((q) => q.node.id == task.node.quest?.id);
        }

        case taskQuestComplete: {
            return player.quests?.some((q) => q.node.id == task.node.quest?.id && q.status == QUEST_COMPLETED);
        }
    }
    return false;
};

export const QuestPanel: FunctionComponent<QuestProps> = ({ player }: QuestProps) => {
    const questMessages = useQuestMessages(5);
    const acceptedQuests = player.quests?.filter((q) => q.status == QUEST_ACCEPTED).sort((a, b) => a.key - b.key) || [];

    useEffect(() => {
        console.log(`effect questMessages:`, questMessages);
    }, [questMessages]);

    if (acceptedQuests.length === 0) {
        return <></>;
    }

    console.log('rebuilding task list');
    const tasks: Task[] = acceptedQuests[0].node.tasks.map((task) => {
        return {
            ...task,
            isCompleted: evalTaskCompletion(task, player, questMessages),
        };
    });

    const numCompleted = tasks.reduce((acc, t) => (t.isCompleted ? acc + 1 : acc), 0);
    const allCompleted = numCompleted == tasks.length;

    const onCompleteClick = (quest: QuestFragment) => {
        console.log('Complete quest!!', quest);
        player
            .dispatch({
                name: 'COMPLETE_QUEST',
                args: [quest.node.id, quest.key],
            })
            .catch((e) => {
                console.error('Failed to complete quest', quest, e);
            });
    };

    return (
        <>
            <Panel>
                <h1>Q.U.E.S.T.s</h1>
                {[acceptedQuests[0]].map((quest) => (
                    <>
                        <div className="header">
                            <h2>{quest.node.name?.value}</h2>
                            {/* {quest.node.location && <LocationButton location={quest.node.location} />} */}
                        </div>
                        <p>{quest.node.description?.value}</p>
                        <div className="taskContainer">
                            {tasks
                                .sort((a, b) => a.key - b.key)
                                .map((task, idx) => (
                                    <TaskItem key={idx} task={task} />
                                ))}
                        </div>
                        {allCompleted && (
                            <div className="buttonContainer">
                                <button
                                    onClick={() => onCompleteClick(quest)}
                                    className="action-icon-button completeQuestButton"
                                >
                                    Complete Quest
                                </button>
                            </div>
                        )}
                    </>
                ))}
            </Panel>
        </>
    );
};

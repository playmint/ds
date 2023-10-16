import { QuestTask, Player, Log, TaskKinds } from '@downstream/core';
import { FunctionComponent, Dispatch, SetStateAction } from 'react';
import { TaskCoord } from './kinds/task-coord';
import { TaskInventory } from './kinds/task-inventory';
import { TaskMessage } from './kinds/task-message';
import { TaskQuestAccept } from './kinds/task-quest-accept';
import { TaskQuestComplete } from './kinds/task-quest-complete';
import { TaskView } from './task-view';
import { id as keccak256UTF8 } from 'ethers';

// TODO: Generate these
const taskCoord = '0x' + BigInt.asUintN(32, BigInt(keccak256UTF8(TaskKinds.coord))).toString(16);
const taskMessage = '0x' + BigInt.asUintN(32, BigInt(keccak256UTF8(TaskKinds.message))).toString(16);
const taskInventory = '0x' + BigInt.asUintN(32, BigInt(keccak256UTF8(TaskKinds.inventory))).toString(16);
const taskQuestAccept = '0x' + BigInt.asUintN(32, BigInt(keccak256UTF8(TaskKinds.questAccept))).toString(16);
const taskQuestComplete = '0x' + BigInt.asUintN(32, BigInt(keccak256UTF8(TaskKinds.questComplete))).toString(16);
// const taskCombat = '0x' + BigInt.asUintN(32, BigInt(keccak256UTF8(TaskKinds.combat))).toString(16);
// const taskCombatWinAttack = '0x' + BigInt.asUintN(32, BigInt(keccak256UTF8(TaskKinds.combatWinAttack))).toString(16);
// const taskCombatWinDefense = '0x' + BigInt.asUintN(32, BigInt(keccak256UTF8(TaskKinds.combatWinDefense))).toString(16);

export interface TaskItemProps {
    task: QuestTask;
    player: Player;
    questMessages?: Log[];
    setTaskCompletion: Dispatch<
        SetStateAction<{
            [key: string]: boolean;
        }>
    >;
}

export const TaskItem: FunctionComponent<TaskItemProps> = ({ task, player, questMessages, setTaskCompletion }) => {
    const taskKind = task.node.keys[0];
    switch (taskKind) {
        case taskCoord:
            return (
                <TaskCoord task={task} mobileUnits={player.mobileUnits || []} setTaskCompletion={setTaskCompletion} />
            );
        case taskInventory:
            return (
                <TaskInventory
                    task={task}
                    mobileUnits={player.mobileUnits || []}
                    setTaskCompletion={setTaskCompletion}
                />
            );
        case taskMessage:
            return <TaskMessage task={task} questMessages={questMessages} setTaskCompletion={setTaskCompletion} />;
        case taskQuestAccept:
            return <TaskQuestAccept task={task} quests={player.quests} setTaskCompletion={setTaskCompletion} />;
        case taskQuestComplete:
            return <TaskQuestComplete task={task} quests={player.quests} setTaskCompletion={setTaskCompletion} />;
        default:
            return <TaskView task={task} isCompleted={false} setTaskCompletion={setTaskCompletion} />;
    }
};

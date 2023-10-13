import { QuestTask, Player, Log } from '@downstream/core';
import { useState, FunctionComponent } from 'react';
import { taskCoord, taskInventory, taskMessage, taskQuestAccept, taskQuestComplete } from '../panels/quest-panel';
import { TaskCoord } from './kinds/task-coord';
import { TaskInventory } from './kinds/task-inventory';
import { TaskMessage } from './kinds/task-message';
import { TaskQuestAccept } from './kinds/task-quest-accept';
import { TaskQuestComplete } from './kinds/task-quest-complete';
import { TaskView } from './task-view';

export interface TaskItemProps {
    task: QuestTask;
    player: Player;
    questMessages?: Log[];
    setTaskCompletion: ReturnType<typeof useState<{ [key: string]: boolean }>>[1];
}

export const TaskItem: FunctionComponent<TaskItemProps> = ({ task, player, questMessages, setTaskCompletion }) => {
    // const calculation = useMemo(() => expensiveCalculation(count), [count]);

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

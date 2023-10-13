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
    isFirst: boolean;
    task: QuestTask;
    player: Player;
    questMessages?: Log[];
    setAllCompleted: ReturnType<typeof useState<boolean>>[1];
}

export const TaskItem: FunctionComponent<TaskItemProps> = ({
    isFirst,
    task,
    player,
    questMessages,
    setAllCompleted,
}) => {
    // const calculation = useMemo(() => expensiveCalculation(count), [count]);

    const taskKind = task.node.keys[0];
    switch (taskKind) {
        case taskCoord:
            return (
                <TaskCoord
                    isFirst={isFirst}
                    task={task}
                    mobileUnits={player.mobileUnits || []}
                    setAllCompleted={setAllCompleted}
                />
            );
        case taskInventory:
            return (
                <TaskInventory
                    isFirst={isFirst}
                    task={task}
                    mobileUnits={player.mobileUnits || []}
                    setAllCompleted={setAllCompleted}
                />
            );
        case taskMessage:
            return (
                <TaskMessage
                    isFirst={isFirst}
                    task={task}
                    questMessages={questMessages}
                    setAllCompleted={setAllCompleted}
                />
            );
        case taskQuestAccept:
            return (
                <TaskQuestAccept
                    isFirst={isFirst}
                    task={task}
                    quests={player.quests}
                    setAllCompleted={setAllCompleted}
                />
            );
        case taskQuestComplete:
            return (
                <TaskQuestComplete
                    isFirst={isFirst}
                    task={task}
                    quests={player.quests}
                    setAllCompleted={setAllCompleted}
                />
            );
        default:
            return <TaskView isFirst={isFirst} task={task} isCompleted={false} setAllCompleted={setAllCompleted} />;
    }
};

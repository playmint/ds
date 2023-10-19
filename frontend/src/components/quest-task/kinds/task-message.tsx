import { Log } from '@downstream/core';
import { memo } from 'react';
import { TaskView } from '../task-view';
import { TaskItemProps } from '../task-item';

export const TaskMessage = memo(
    ({
        task,
        questMessages,
        setTaskCompletion,
    }: {
        questMessages?: Log[];
    } & Pick<TaskItemProps, 'task' | 'setTaskCompletion'>) => {
        // console.log(`evaluating TaskMessage`);

        const pluginMessages =
            (task.node.buildingKind &&
                questMessages &&
                questMessages.filter((m) => m.name === `questMessages: ${task.node.buildingKind?.id}`)) ||
            [];
        const isCompleted = pluginMessages.some((m) => m.text == task.node.message?.value);

        return <TaskView isCompleted={isCompleted} task={task} setTaskCompletion={setTaskCompletion} />;
    }
);

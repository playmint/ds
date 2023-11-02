import { Log } from '@downstream/core';
import { memo, useEffect } from 'react';
import { TaskItemProps } from '../task-item';

export const TaskMessage = memo(
    ({
        task,
        questMessages,
        setTaskCompletion,
    }: {
        questMessages?: Log[];
    } & Pick<TaskItemProps, 'task' | 'setTaskCompletion'>) => {
        console.log(`evaluating TaskMessage`);

        const pluginMessages =
            (task.node.buildingKind &&
                questMessages &&
                questMessages.filter((m) => m.name === `questMessages: ${task.node.buildingKind?.id}`)) ||
            [];
        const isCompleted = pluginMessages.some((m) => m.text == task.node.message?.value);

        const taskId = task.node.id;
        useEffect(() => {
            setTaskCompletion((oldObj) => {
                const newObj = oldObj ? { ...oldObj } : {};
                newObj[taskId] = isCompleted;
                return newObj;
            });
        }, [taskId, isCompleted, setTaskCompletion]);

        return <></>;
    }
);

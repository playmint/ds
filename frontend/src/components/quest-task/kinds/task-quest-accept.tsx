import { AssignedQuestFragment } from '@downstream/core';
import { memo, useEffect } from 'react';
import { TaskItemProps } from '../task-item';

export const TaskQuestAccept = memo(
    ({
        task,
        quests,
        setTaskCompletion,
    }: {
        quests?: AssignedQuestFragment[];
    } & Pick<TaskItemProps, 'task' | 'setTaskCompletion'>) => {
        // console.log(`evaluating TaskQuestAccept`);
        const isCompleted = !!quests?.some((q) => q.node.id == task.node.quest?.id);

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

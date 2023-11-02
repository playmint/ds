import { QuestFragment, QUEST_STATUS_COMPLETED } from '@downstream/core';
import { memo, useEffect } from 'react';
import { TaskItemProps } from '../task-item';

export const TaskQuestComplete = memo(
    ({
        task,
        quests,
        setTaskCompletion,
    }: {
        quests?: QuestFragment[];
    } & Pick<TaskItemProps, 'task' | 'setTaskCompletion'>) => {
        // console.log(`evaluating TaskQuestCompleted`);
        const isCompleted = !!quests?.some(
            (q) => q.node.id == task.node.quest?.id && q.status == QUEST_STATUS_COMPLETED
        );

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

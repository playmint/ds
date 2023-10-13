import { QuestTask, QuestFragment } from '@downstream/core';
import { memo, useState } from 'react';
import { TaskView } from '../task-view';
import { TaskItemProps } from '../task-item';

export const TaskQuestAccept = memo(
    ({
        task,
        quests,
        setTaskCompletion,
    }: {
        quests?: QuestFragment[];
    } & Pick<TaskItemProps, 'task' | 'setTaskCompletion'>) => {
        console.log(`evaluating TaskQuestAccept`);
        const isCompleted = !!quests?.some((q) => q.node.id == task.node.quest?.id);

        return <TaskView isCompleted={isCompleted} task={task} setTaskCompletion={setTaskCompletion} />;
    }
);

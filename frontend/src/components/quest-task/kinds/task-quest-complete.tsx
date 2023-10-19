import { QuestFragment, QUEST_STATUS_COMPLETED } from '@downstream/core';
import { memo } from 'react';
import { TaskView } from '../task-view';
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

        return <TaskView isCompleted={isCompleted} task={task} setTaskCompletion={setTaskCompletion} />;
    }
);

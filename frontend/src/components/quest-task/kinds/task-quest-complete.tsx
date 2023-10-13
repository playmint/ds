import { QuestTask, QuestFragment, QUEST_STATUS_COMPLETED } from '@downstream/core';
import { memo, useState } from 'react';
import { TaskView } from '../task-view';

export const TaskQuestComplete = memo(
    ({
        isFirst,
        task,
        quests,
        setAllCompleted,
    }: {
        isFirst: boolean;
        task: QuestTask;
        quests?: QuestFragment[];
        setAllCompleted: ReturnType<typeof useState<boolean>>[1];
    }) => {
        console.log(`evaluating TaskQuestCompleted`);
        const isCompleted = !!quests?.some(
            (q) => q.node.id == task.node.quest?.id && q.status == QUEST_STATUS_COMPLETED
        );

        return <TaskView isFirst={isFirst} isCompleted={isCompleted} task={task} setAllCompleted={setAllCompleted} />;
    }
);

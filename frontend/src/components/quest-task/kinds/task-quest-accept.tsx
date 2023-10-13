import { QuestTask, QuestFragment } from '@downstream/core';
import { memo, useState } from 'react';
import { TaskView } from '../task-view';

export const TaskQuestAccept = memo(
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
        console.log(`evaluating TaskQuestAccept`);
        const isCompleted = !!quests?.some((q) => q.node.id == task.node.quest?.id);

        return <TaskView isFirst={isFirst} isCompleted={isCompleted} task={task} setAllCompleted={setAllCompleted} />;
    }
);

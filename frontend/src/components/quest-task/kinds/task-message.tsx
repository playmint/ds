import { Log, QuestTask } from '@downstream/core';
import { memo, useState } from 'react';
import { TaskView } from '../task-view';

export const TaskMessage = memo(
    ({
        isFirst,
        task,
        questMessages,
        setAllCompleted,
    }: {
        isFirst: boolean;
        task: QuestTask;
        questMessages?: Log[];
        setAllCompleted: ReturnType<typeof useState<boolean>>[1];
    }) => {
        console.log(`evaluating TaskMessage`);

        const pluginMessages =
            (task.node.buildingKind &&
                questMessages &&
                questMessages.filter((m) => m.name === `questMessages: ${task.node.buildingKind?.id}`)) ||
            [];
        const isCompleted = pluginMessages.some((m) => m.text == task.node.message?.value);

        return <TaskView isFirst={isFirst} isCompleted={isCompleted} task={task} setAllCompleted={setAllCompleted} />;
    }
);

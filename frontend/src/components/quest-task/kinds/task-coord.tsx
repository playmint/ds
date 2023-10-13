import { getTileDistance } from '@app/helpers/tile';
import { QuestTask, MobileUnit } from '@downstream/core';
import { memo, useState } from 'react';
import { TaskView } from '../task-view';

export const TaskCoord = memo(
    ({
        isFirst,
        task,
        mobileUnits,
        setAllCompleted,
    }: {
        isFirst: boolean;
        task: QuestTask;
        mobileUnits: MobileUnit[];
        setAllCompleted: ReturnType<typeof useState<boolean>>[1];
    }) => {
        console.log(`evaluating TaskCoord`);
        const isCompleted = mobileUnits?.some((unit) => {
            return (
                unit.nextLocation &&
                task.node.location &&
                getTileDistance(unit.nextLocation.tile, task.node.location) < 2
            );
        });

        return <TaskView isFirst={isFirst} isCompleted={isCompleted} task={task} setAllCompleted={setAllCompleted} />;
    }
);

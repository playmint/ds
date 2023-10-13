import { getTileDistance } from '@app/helpers/tile';
import { QuestTask, MobileUnit } from '@downstream/core';
import { memo, useState } from 'react';
import { TaskView } from '../task-view';
import { TaskItemProps } from '../task-item';

export const TaskCoord = memo(
    ({
        task,
        mobileUnits,
        setTaskCompletion,
    }: {
        mobileUnits: MobileUnit[];
    } & Pick<TaskItemProps, 'task' | 'setTaskCompletion'>) => {
        console.log(`evaluating TaskCoord`);
        const isCompleted = mobileUnits?.some((unit) => {
            return (
                unit.nextLocation &&
                task.node.location &&
                getTileDistance(unit.nextLocation.tile, task.node.location) < 2
            );
        });

        return <TaskView isCompleted={isCompleted} task={task} setTaskCompletion={setTaskCompletion} />;
    }
);

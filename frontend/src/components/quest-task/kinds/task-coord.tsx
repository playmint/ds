import { getTileDistance } from '@app/helpers/tile';
import { MobileUnit } from '@downstream/core';
import { memo, useEffect } from 'react';
import { TaskItemProps } from '../task-item';

export const TaskCoord = memo(
    ({
        task,
        mobileUnits,
        setTaskCompletion,
    }: {
        mobileUnits: MobileUnit[];
    } & Pick<TaskItemProps, 'task' | 'setTaskCompletion'>) => {
        // console.log(`evaluating TaskCoord`);

        const isCompleted = mobileUnits?.some((unit) => {
            return (
                unit.nextLocation &&
                task.node.location &&
                getTileDistance(unit.nextLocation.tile, task.node.location) < 2
            );
        });

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

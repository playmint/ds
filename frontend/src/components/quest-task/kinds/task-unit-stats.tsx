import { BagFragment, MobileUnit } from '@downstream/core';
import { memo, useEffect } from 'react';
import { TaskItemProps } from '../task-item';
import { NUM_STAT_KINDS, getMobileUnitStats } from '@app/plugins/combat/helpers';

export const TaskUnitStats = memo(
    ({
        task,
        mobileUnits,
        worldBags,
        setTaskCompletion,
    }: {
        mobileUnits?: MobileUnit[];
        worldBags: BagFragment[];
    } & Pick<TaskItemProps, 'task' | 'setTaskCompletion'>) => {
        // console.log(`evaluating TaskUnitStats`);

        const isCompleted =
            !!mobileUnits &&
            task.node.unitStats.length === NUM_STAT_KINDS &&
            mobileUnits.some((m) => {
                const stats = getMobileUnitStats(m, worldBags);

                // All unit's stats must be greater than or equal to the stats defined in the task
                return task.node.unitStats.every(
                    (statEdge) => statEdge.key < NUM_STAT_KINDS && stats[statEdge.key] >= statEdge.weight
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

import { BuildingKindFragment } from '@downstream/core';
import { memo } from 'react';
import { TaskView } from '../task-view';
import { TaskItemProps } from '../task-item';

export const TaskDeployBuilding = memo(
    ({
        task,
        buildingKinds,
        playerID,
        setTaskCompletion,
    }: {
        playerID: string;
        buildingKinds: BuildingKindFragment[];
    } & Pick<TaskItemProps, 'task' | 'setTaskCompletion'>) => {
        // console.log(`evaluating TaskDeployBuilding`);
        const isCompleted = buildingKinds.some((b) => {
            return b.owner?.id == playerID;
        });

        return <TaskView isCompleted={isCompleted} task={task} setTaskCompletion={setTaskCompletion} />;
    }
);

import { WorldTileFragment } from '@downstream/core';
import { memo } from 'react';
import { TaskView } from '../task-view';
import { TaskItemProps } from '../task-item';

export const TaskConstruct = memo(
    ({
        task,
        tiles,
        playerID,
        setTaskCompletion,
    }: {
        playerID: string;
        tiles: WorldTileFragment[];
    } & Pick<TaskItemProps, 'task' | 'setTaskCompletion'>) => {
        console.log(`evaluating TaskConstruct`);
        const isCompleted = !!tiles.some((t) => {
            return (
                t.building?.owner?.id == playerID &&
                (task.node.buildingKind ? t.building?.kind?.id == task.node.buildingKind.id : true)
            );
        });

        return <TaskView isCompleted={isCompleted} task={task} setTaskCompletion={setTaskCompletion} />;
    }
);

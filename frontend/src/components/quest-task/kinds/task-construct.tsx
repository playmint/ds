import { WorldBuildingFragment, WorldTileFragment } from '@downstream/core';
import { memo } from 'react';
import { TaskView } from '../task-view';
import { TaskItemProps } from '../task-item';
import { getBuildingAtTile } from '@downstream/core/src/utils';

export const TaskConstruct = memo(
    ({
        task,
        tiles,
        buildings,
        playerID,
        setTaskCompletion,
    }: {
        playerID: string;
        tiles: WorldTileFragment[];
        buildings: WorldBuildingFragment[];
    } & Pick<TaskItemProps, 'task' | 'setTaskCompletion'>) => {
        // console.log(`evaluating TaskConstruct`);
        const isCompleted = !!tiles.some((t) => {
            const building = getBuildingAtTile(buildings, t);
            return (
                building?.owner?.id == playerID &&
                (task.node.buildingKind ? building?.kind?.id == task.node.buildingKind.id : true)
            );
        });

        return <TaskView isCompleted={isCompleted} task={task} setTaskCompletion={setTaskCompletion} />;
    }
);

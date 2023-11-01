import { BuildingKindFragment } from '@downstream/core';
import { memo, useEffect } from 'react';
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
            const requiredInput = task.node.craftItems.find((i) => i.key === 0);
            const craftInputRequired = requiredInput ? requiredInput.item.id : undefined;
            const requiredOutput = task.node.craftItems.find((i) => i.key === 1);
            const craftOutputRequired = requiredOutput ? requiredOutput.item.id : undefined;
            return (
                b.owner?.id == playerID &&
                (!craftInputRequired || b.inputs.some((i) => i?.item?.id == craftInputRequired)) &&
                (!craftOutputRequired || b.outputs.some((i) => i?.item?.id == craftOutputRequired))
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

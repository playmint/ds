import { memo, useEffect, useState } from 'react';
import { TaskItemProps } from '../task-item';

// const ATTACK_WIN = 0;
// const DEFENCE_WIN = 1;

const DEBOUNCE_MS = 500;

export const TaskCombat = memo(
    ({
        task,
        playerUnitIDs,
        setTaskCompletion,
    }: {
        playerUnitIDs: string[];
    } & Pick<TaskItemProps, 'task' | 'setTaskCompletion'>) => {
        const [isCompleted, setIsCompleted] = useState(false);

        // Logic set within a setTimeout to debounce
        useEffect(() => {
            const evalTimeoutID = setTimeout(() => {
                // TODO: This tasks auto completes as we don't keep past sessions anymore
                setIsCompleted(true);
            }, DEBOUNCE_MS);

            return () => {
                clearTimeout(evalTimeoutID);
            };
        }, [playerUnitIDs]);

        const taskId = task.node.id;
        useEffect(() => {
            setTaskCompletion((oldObj) => {
                const newObj = oldObj ? { ...oldObj } : {};
                newObj[taskId] = isCompleted;
                return newObj;
            });
        }, [taskId, isCompleted, setTaskCompletion]);

        return null;
    }
);

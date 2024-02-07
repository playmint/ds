import { memo, useEffect, useState } from 'react';
import { TaskItemProps } from '../task-item';
import { WorldCombatSessionFragment } from '@downstream/core/src/gql/graphql';

// const ATTACK_WIN = 0;
// const DEFENCE_WIN = 1;

const DEBOUNCE_MS = 500;

export const TaskCombat = memo(
    ({
        task,
        sessions,
        playerUnitIDs,
        setTaskCompletion,
    }: {
        sessions: WorldCombatSessionFragment[];
        playerUnitIDs: string[];
    } & Pick<TaskItemProps, 'task' | 'setTaskCompletion'>) => {
        const [isCompleted, setIsCompleted] = useState(false);

        // Logic set within a setTimeout to debounce
        useEffect(() => {
            const evalTimeoutID = setTimeout(() => {
                // const isCompleted = !!sessions.some((s) => {
                //     if (!s.isFinalised) return false;
                //     // TODO: Find a combat session that the playe participated in and won
                // });

                // setIsCompleted(isCompleted);
                setIsCompleted(true);
            }, DEBOUNCE_MS);

            return () => {
                clearTimeout(evalTimeoutID);
            };
        }, [playerUnitIDs, sessions, task.node.combatState?.value]);

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

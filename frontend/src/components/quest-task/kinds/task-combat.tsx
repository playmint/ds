import { memo, useEffect, useState } from 'react';
import { TaskItemProps } from '../task-item';
import { convertCombatActions, getActions } from '@app/plugins/combat/helpers';
import { Combat, CombatWinState, EntityState } from '@app/plugins/combat/combat';
import { WorldCombatSessionFragment } from '@downstream/core/src/gql/graphql';

const ATTACK_WIN = 0;
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
                console.log(`evaluating TaskCombat`);
                const isCompleted = !!sessions.some((s) => {
                    if (!s.isFinalised) return false;

                    // TODO: WARN: This will not scale as it's searching through every combat that has ever happened looking for the player's unit.
                    const actions = getActions(s);
                    const convertedActions = convertCombatActions(actions);
                    const combat = new Combat(); // Is a class because it was converted from solidity
                    const orderedListIndexes = combat.getOrderedListIndexes(convertedActions);

                    // Because we only care about finalised tasks, the block number isn't important and can be some way off in the future one
                    const combatState = combat.calcCombatState(
                        convertedActions,
                        orderedListIndexes,
                        Number.MAX_SAFE_INTEGER
                    );

                    let winnerStates: EntityState[];
                    if (task.node.combatState?.value == ATTACK_WIN) {
                        if (combatState.winState != CombatWinState.ATTACKERS) return false;

                        winnerStates = combatState.attackerStates;
                    } else {
                        if (combatState.winState != CombatWinState.DEFENDERS) return false;

                        winnerStates = combatState.attackerStates;
                    }

                    // We don't care if the player's unit died, they just needed to have not left the battle
                    return winnerStates.some(
                        (participant) => participant.isPresent && playerUnitIDs.some((id) => id == participant.entityID)
                    );
                });

                setIsCompleted(isCompleted);
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

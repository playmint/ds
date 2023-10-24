import { BagFragment, MobileUnit } from '@downstream/core';
import { memo } from 'react';
import { TaskView } from '../task-view';
import { TaskItemProps } from '../task-item';
import {
    LIFE_MUL,
    UNIT_BASE_ATTACK,
    UNIT_BASE_DEFENCE,
    UNIT_BASE_LIFE,
    NUM_STAT_KINDS,
    getEquipmentStats,
} from '@app/plugins/combat/helpers';
import { ATOM_LIFE, ATOM_ATTACK, ATOM_DEFENSE } from '@app/plugins/combat/combat';
import { getBagsAtEquipee } from '@downstream/core/src/utils';

export const TaskUnitStats = memo(
    ({
        task,
        mobileUnits,
        bags,
        setTaskCompletion,
    }: {
        mobileUnits?: MobileUnit[];
        bags: BagFragment[];
    } & Pick<TaskItemProps, 'task' | 'setTaskCompletion'>) => {
        // console.log(`evaluating TaskUnitStats`);

        const isCompleted =
            !!mobileUnits &&
            task.node.unitStats.length === NUM_STAT_KINDS &&
            mobileUnits.some((m) => {
                const unitBags = getBagsAtEquipee(bags, m);
                const stats = getEquipmentStats(unitBags);
                stats[ATOM_LIFE] += UNIT_BASE_LIFE * LIFE_MUL;
                stats[ATOM_DEFENSE] += UNIT_BASE_DEFENCE;
                stats[ATOM_ATTACK] += UNIT_BASE_ATTACK;

                console.log('unit stats:', stats);

                // All unit's stats must be greater than or equal to the stats defined in the task
                return task.node.unitStats.reduce(
                    (isGTE, statEdge) =>
                        isGTE && statEdge.key < NUM_STAT_KINDS && stats[statEdge.key] >= statEdge.weight,
                    true
                );
            });

        return <TaskView isCompleted={isCompleted} task={task} setTaskCompletion={setTaskCompletion} />;
    }
);

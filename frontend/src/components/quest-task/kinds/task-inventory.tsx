import { MobileUnit } from '@downstream/core';
import { memo } from 'react';
import { TaskView } from '../task-view';
import { TaskItemProps } from '../task-item';

export const TaskInventory = memo(
    ({
        task,
        mobileUnits,
        setTaskCompletion,
    }: {
        mobileUnits: MobileUnit[];
    } & Pick<TaskItemProps, 'task' | 'setTaskCompletion'>) => {
        // console.log(`evaluating TaskInventory`);

        let isCompleted = false;

        const taskItemSlot = task.node.itemSlot;
        if (taskItemSlot) {
            const itemCount =
                mobileUnits.reduce((playerTotal, unit) => {
                    if (!unit.bags) return playerTotal;
                    return (
                        playerTotal +
                        unit.bags.reduce((bagTotal, bagSlot) => {
                            return (
                                bagTotal +
                                bagSlot.bag.slots.reduce((slotTotal, itemSlot) => {
                                    return itemSlot.item.id == taskItemSlot.item.id
                                        ? slotTotal + itemSlot.balance
                                        : slotTotal;
                                }, 0)
                            );
                        }, 0)
                    );
                }, 0) || 0;
            isCompleted = itemCount >= taskItemSlot.balance;
        }

        return <TaskView isCompleted={isCompleted} task={task} setTaskCompletion={setTaskCompletion} />;
    }
);

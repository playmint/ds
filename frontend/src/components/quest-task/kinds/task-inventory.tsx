import { QuestTask, MobileUnit } from '@downstream/core';
import { memo, useState } from 'react';
import { TaskView } from '../task-view';

export const TaskInventory = memo(
    ({
        isFirst,
        task,
        mobileUnits,
        setAllCompleted,
    }: {
        isFirst: boolean;
        task: QuestTask;
        mobileUnits: MobileUnit[];
        setAllCompleted: ReturnType<typeof useState<boolean>>[1];
    }) => {
        console.log(`evaluating TaskInventory`);

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

        return <TaskView isFirst={isFirst} isCompleted={isCompleted} task={task} setAllCompleted={setAllCompleted} />;
    }
);

import { BagFragment, MobileUnit } from '@downstream/core';
import { memo, useEffect } from 'react';
import { TaskItemProps } from '../task-item';
import { getBagsAtEquipee } from '@downstream/core/src/utils';

export const TaskInventory = memo(
    ({
        task,
        mobileUnits,
        bags,

        setTaskCompletion,
    }: {
        mobileUnits: MobileUnit[];
        bags: BagFragment[];
    } & Pick<TaskItemProps, 'task' | 'setTaskCompletion'>) => {
        // console.log(`evaluating TaskInventory`);

        let isCompleted = false;

        const taskItemSlot = task.node.itemSlot;
        if (taskItemSlot) {
            const itemCount =
                mobileUnits.reduce((playerTotal, unit) => {
                    const unitBags = getBagsAtEquipee(bags, unit);
                    if (unitBags.length === 0) return playerTotal;
                    return (
                        playerTotal +
                        unitBags.reduce((bagTotal, bag) => {
                            return (
                                bagTotal +
                                bag.slots.reduce((slotTotal, itemSlot) => {
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

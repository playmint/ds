import {
    QuestTask,
    Player,
    Log,
    TaskKinds,
    WorldStateFragment,
    BuildingKindFragment,
    WorldTileFragment,
} from '@downstream/core';
import { FunctionComponent, Dispatch, SetStateAction } from 'react';
import { TaskCoord } from './kinds/task-coord';
import { TaskInventory } from './kinds/task-inventory';
import { TaskMessage } from './kinds/task-message';
import { TaskQuestAccept } from './kinds/task-quest-accept';
import { TaskQuestComplete } from './kinds/task-quest-complete';
import { id as keccak256UTF8 } from 'ethers';
import { TaskConstruct } from './kinds/task-construct';
import { TaskCombat } from './kinds/task-combat';
import { TaskDeployBuilding } from './kinds/task-deploy-building';
import { TaskUnitStats } from './kinds/task-unit-stats';

// TODO: Generate these
const taskCoord = '0x' + BigInt.asUintN(32, BigInt(keccak256UTF8(TaskKinds.coord))).toString(16);
const taskMessage = '0x' + BigInt.asUintN(32, BigInt(keccak256UTF8(TaskKinds.message))).toString(16);
const taskInventory = '0x' + BigInt.asUintN(32, BigInt(keccak256UTF8(TaskKinds.inventory))).toString(16);
const taskQuestAccept = '0x' + BigInt.asUintN(32, BigInt(keccak256UTF8(TaskKinds.questAccept))).toString(16);
const taskQuestComplete = '0x' + BigInt.asUintN(32, BigInt(keccak256UTF8(TaskKinds.questComplete))).toString(16);
const taskCombat = '0x' + BigInt.asUintN(32, BigInt(keccak256UTF8(TaskKinds.combat))).toString(16);
const taskConstruct = '0x' + BigInt.asUintN(32, BigInt(keccak256UTF8(TaskKinds.construct))).toString(16);
const taskDeployBuilding = '0x' + BigInt.asUintN(32, BigInt(keccak256UTF8(TaskKinds.deployBuilding))).toString(16);
const taskUnitStats = '0x' + BigInt.asUintN(32, BigInt(keccak256UTF8(TaskKinds.unitStats))).toString(16);

export interface TaskItemProps {
    task: QuestTask;
    world: WorldStateFragment;
    tiles: WorldTileFragment[];
    buildingKinds: BuildingKindFragment[];
    player: Player;
    questMessages?: Log[];
    setTaskCompletion: Dispatch<
        SetStateAction<{
            [key: string]: boolean;
        }>
    >;
}

export const TaskItem: FunctionComponent<TaskItemProps> = ({
    task,
    world,
    tiles,
    buildingKinds,
    player,
    questMessages,
    setTaskCompletion,
}) => {
    const taskKind = task.node.keys[0];
    const playerUnits = world?.mobileUnits.filter((mu) => mu.owner && player && mu.owner.id === player.id) || [];
    switch (taskKind) {
        case taskCoord:
            return <TaskCoord task={task} mobileUnits={playerUnits || []} setTaskCompletion={setTaskCompletion} />;
        case taskInventory:
            return (
                <TaskInventory
                    bags={world?.bags || []}
                    task={task}
                    mobileUnits={playerUnits || []}
                    setTaskCompletion={setTaskCompletion}
                />
            );
        case taskMessage:
            return <TaskMessage task={task} questMessages={questMessages} setTaskCompletion={setTaskCompletion} />;
        case taskQuestAccept:
            return <TaskQuestAccept task={task} quests={player.quests} setTaskCompletion={setTaskCompletion} />;
        case taskQuestComplete:
            return <TaskQuestComplete task={task} quests={player.quests} setTaskCompletion={setTaskCompletion} />;
        case taskConstruct:
            return (
                <TaskConstruct
                    buildings={world?.buildings || []}
                    task={task}
                    tiles={tiles}
                    playerID={player.id}
                    setTaskCompletion={setTaskCompletion}
                />
            );
        case taskCombat:
            return (
                <TaskCombat
                    sessions={world?.sessions || []}
                    task={task}
                    tiles={tiles}
                    mobileUnits={playerUnits}
                    setTaskCompletion={setTaskCompletion}
                />
            );
        case taskDeployBuilding:
            return (
                <TaskDeployBuilding
                    task={task}
                    buildingKinds={buildingKinds}
                    playerID={player.id}
                    setTaskCompletion={setTaskCompletion}
                />
            );
        case taskUnitStats:
            return (
                <TaskUnitStats
                    bags={world?.bags || []}
                    task={task}
                    mobileUnits={playerUnits}
                    setTaskCompletion={setTaskCompletion}
                />
            );
    }

    return null;
};

import { QuestTaskEdge, Player, Log, ZoneWithBags, BuildingKindFragment, WorldTileFragment } from '@downstream/core';
import { FunctionComponent, Dispatch, SetStateAction, useRef } from 'react';
import { TaskCoord } from './kinds/task-coord';
import { TaskInventory } from './kinds/task-inventory';
import { TaskMessage } from './kinds/task-message';
import { TaskQuestAccept } from './kinds/task-quest-accept';
import { TaskQuestComplete } from './kinds/task-quest-complete';
import { TaskConstruct } from './kinds/task-construct';
import { TaskCombat } from './kinds/task-combat';
import { TaskDeployBuilding } from './kinds/task-deploy-building';
import { TaskUnitStats } from './kinds/task-unit-stats';
import { TaskKindEnumVals } from '@downstream/cli/utils/manifest';

export interface TaskItemProps {
    task: QuestTaskEdge;
    zone: ZoneWithBags;
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

const usePlayerUnitIDsMemo = (unitIDs: string[]) => {
    const ref = useRef<string[]>(unitIDs);

    const isDifferent = unitIDs.length != ref.current.length || unitIDs.some((id) => !ref.current.includes(id));
    if (isDifferent) {
        ref.current = unitIDs;
    }

    return ref.current;
};

const useTaskMemo = (task: QuestTaskEdge) => {
    const ref = useRef<QuestTaskEdge>(task);

    const isDifferent = task.node.id != ref.current.node.id;
    if (isDifferent) {
        ref.current = task;
    }

    return ref.current;
};

export const TaskItem: FunctionComponent<TaskItemProps> = ({
    task,
    zone,
    tiles,
    buildingKinds,
    player,
    questMessages,
    setTaskCompletion,
}) => {
    const quests = player?.zone?.quests || [];
    const taskKindIndex = Number(BigInt.asUintN(8, BigInt(task.node.id) >> BigInt(64)));
    const taskKindValue = TaskKindEnumVals[taskKindIndex];
    const playerUnits = zone?.mobileUnits.filter((mu) => mu.owner && player && mu.owner.id === player.id) || [];

    // The ref to the array containing the IDs is only updated if the IDs change. Needed so the CombatMemo didn't update every time we supplied it with a newly filtered list
    const playerUnitIDs = usePlayerUnitIDsMemo(playerUnits.map((u) => u.id));
    const taskMemo = useTaskMemo(task);

    switch (taskKindValue) {
        case 'coord':
            return <TaskCoord task={taskMemo} mobileUnits={playerUnits || []} setTaskCompletion={setTaskCompletion} />;
        case 'inventory':
            return (
                <TaskInventory
                    bags={zone?.bags || []}
                    task={taskMemo}
                    mobileUnits={playerUnits || []}
                    setTaskCompletion={setTaskCompletion}
                />
            );
        case 'message':
            return <TaskMessage task={taskMemo} questMessages={questMessages} setTaskCompletion={setTaskCompletion} />;
        case 'questAccept':
            return <TaskQuestAccept task={taskMemo} quests={quests} setTaskCompletion={setTaskCompletion} />;
        case 'questComplete':
            return <TaskQuestComplete task={taskMemo} quests={quests} setTaskCompletion={setTaskCompletion} />;
        case 'construct':
            return (
                <TaskConstruct
                    buildings={zone?.buildings || []}
                    task={taskMemo}
                    tiles={tiles}
                    playerID={player.id}
                    setTaskCompletion={setTaskCompletion}
                />
            );
        case 'combat':
            return <TaskCombat task={taskMemo} playerUnitIDs={playerUnitIDs} setTaskCompletion={setTaskCompletion} />;
        case 'deployBuilding':
            return (
                <TaskDeployBuilding
                    task={taskMemo}
                    buildingKinds={buildingKinds}
                    playerID={player.id}
                    setTaskCompletion={setTaskCompletion}
                />
            );
        case 'unitStats':
            return (
                <TaskUnitStats
                    worldBags={zone?.bags || []}
                    task={taskMemo}
                    mobileUnits={playerUnits}
                    setTaskCompletion={setTaskCompletion}
                />
            );
        default:
            console.warn(`unexpected task kind: ${taskKindValue}`);
    }

    return null;
};

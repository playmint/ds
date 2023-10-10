import { Player, QuestFragment, TaskKinds } from '@app/../../core/src';
import styled from 'styled-components';
import { FunctionComponent } from 'react';
import { Locatable, getCoords, getTileDistance } from '@app/helpers/tile';
import { id as keccak256UTF8 } from 'ethers';

const Panel = styled.div`
    background: #143063;
    color: #fff;
    padding: 2rem 2rem;
    margin-bottom: 1.2rem;
    width: 52rem;

    > h1 {
        text-align: center;
        margin-bottom: 1rem;
    }

    > .taskContainer {
        margin-top: 1rem;
    }

    > .buttonContainer {
        margin-top: 1rem;
        display: flex;
        justify-content: center;
    }

    > .buttonContainer .completeQuestButton {
        width: 30rem;
    }
`;

export interface QuestProps {
    player: Player;
}

export const ACCEPTED = 1;
export const COMPLETED = 2;

// TODO: Generate these
export const taskCoord = '0x' + BigInt.asUintN(32, BigInt(keccak256UTF8(TaskKinds.coord))).toString(16);
export const taskButton = '0x' + BigInt.asUintN(32, BigInt(keccak256UTF8(TaskKinds.button))).toString(16);
export const taskInventory = '0x' + BigInt.asUintN(32, BigInt(keccak256UTF8(TaskKinds.inventory))).toString(16);
export const taskCombat = '0x' + BigInt.asUintN(32, BigInt(keccak256UTF8(TaskKinds.combat))).toString(16);
export const taskCombatWinAttack =
    '0x' + BigInt.asUintN(32, BigInt(keccak256UTF8(TaskKinds.combatWinAttack))).toString(16);
export const taskCombatWinDefense =
    '0x' + BigInt.asUintN(32, BigInt(keccak256UTF8(TaskKinds.combatWinDefense))).toString(16);
export const taskQuestAccept = '0x' + BigInt.asUintN(32, BigInt(keccak256UTF8(TaskKinds.questAccept))).toString(16);
export const taskQuestComplete = '0x' + BigInt.asUintN(32, BigInt(keccak256UTF8(TaskKinds.questComplete))).toString(16);

type Task = QuestFragment['node']['tasks'][0] & Partial<{ isCompleted: boolean }>;

const TaskItem: FunctionComponent<{ task: Task }> = ({ task }) => {
    return (
        <p>
            {task.isCompleted ? '[X]' : '[ ]'} {task.node.name?.value}
        </p>
    );
};
const LocationButton: FunctionComponent<{ location: Locatable }> = ({ location }) => {
    const { q, r, s } = getCoords(location);
    return <p>{`${q} ${r} ${s}`}</p>;
};

const evalTaskCompletion = (task: Task, player: Player) => {
    console.log(`compare ${task.node.keys[0]} with ${taskCoord}`);
    switch (task.node.keys[0]) {
        case taskCoord:
            return player.mobileUnits?.some((unit) => {
                console.log(`compare ${unit.nextLocation?.tile.coords} : ${task.node.location?.coords}`);
                return (
                    unit.nextLocation &&
                    task.node.location &&
                    getTileDistance(unit.nextLocation.tile, task.node.location) < 2
                );
            });

        case taskInventory:
            return true;
    }
    return false;
};

export const QuestPanel: FunctionComponent<QuestProps> = ({ player }: QuestProps) => {
    const acceptedQuests = player.quests?.filter((q) => q.status == ACCEPTED).sort((a, b) => a.key - b.key) || [];
    if (acceptedQuests.length === 0) {
        return <></>;
    }

    const tasks: Task[] = acceptedQuests[0].node.tasks.map((task) => {
        return {
            ...task,
            isCompleted: evalTaskCompletion(task, player),
        };
    });

    const numCompleted = tasks.reduce((acc, t) => (t.isCompleted ? acc + 1 : acc), 0);
    const allCompleted = numCompleted == tasks.length;

    const onCompleteClick = () => {
        console.log('Complete quest!!' + numCompleted);
    };

    return (
        <>
            <Panel>
                <h1>Q.U.E.S.T.s</h1>
                {[acceptedQuests[0]].map((quest) => (
                    <>
                        <div className="header">
                            <h2>{quest.node.name?.value}</h2>
                            {/* {quest.node.location && <LocationButton location={quest.node.location} />} */}
                        </div>
                        <p>{quest.node.description?.value}</p>
                        <div className="taskContainer">
                            {tasks
                                .sort((a, b) => a.key - b.key)
                                .map((task, idx) => (
                                    <TaskItem key={idx} task={task} />
                                ))}
                        </div>
                        {allCompleted && (
                            <div className="buttonContainer">
                                <button onClick={onCompleteClick} className="action-icon-button completeQuestButton">
                                    Complete Quest
                                </button>
                            </div>
                        )}
                    </>
                ))}
            </Panel>
        </>
    );
};

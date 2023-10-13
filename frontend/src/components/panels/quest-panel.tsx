import { ConnectedPlayer, QUEST_STATUS_ACCEPTED, QuestFragment, TaskKinds } from '@app/../../core/src';
import styled from 'styled-components';
import { FunctionComponent, useEffect, useState } from 'react';
import { Locatable, getCoords } from '@app/helpers/tile';
import { id as keccak256UTF8 } from 'ethers';
import { useQuestMessages } from '@app/hooks/use-game-state';
import { useUnityMap } from '@app/hooks/use-unity-map';
import { TaskItem } from '../quest-task/task-item';

const Panel = styled.div`
    background: #143063;
    color: #fff;
    padding: 2rem 2rem;
    width: 52rem;

    > h1 {
        text-align: center;
        margin-bottom: 1rem;
    }

    > .questItem .taskContainer {
        margin-top: 2rem;
    }

    .taskItem {
        display: flex;
        align-items: center;
        margin-bottom: 1rem;
    }

    .taskItem .tickBox {
        flex-shrink: 0;
        margin-right: 1rem;
        background: white;
        width: 2rem;
        height: 2rem;
        border-radius: 0.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .taskItem svg {
        fill: #63b204;
    }

    .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .focusButton {
        cursor: pointer;
        top: 1rem;
        right: 1rem;
        width: 3rem;
        height: 3rem;
        background-color: #0665f5ff;
        border-radius: 0.5rem;
        padding: 0.3rem;
    }

    .focusButton svg {
        /* fill: #ca002b; */
        fill: white;
        width: 100%;
        height: 100%;
    }

    > .questItem .buttonContainer {
        margin-top: 1rem;
        display: flex;
        justify-content: center;
    }

    > .questItem .buttonContainer .completeQuestButton {
        width: 30rem;
    }
`;

const targetSvg = (
    <svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 512 512">
        <path d="M448 256A192 192 0 1 0 64 256a192 192 0 1 0 384 0zM0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256zm256 80a80 80 0 1 0 0-160 80 80 0 1 0 0 160zm0-224a144 144 0 1 1 0 288 144 144 0 1 1 0-288zM224 256a32 32 0 1 1 64 0 32 32 0 1 1 -64 0z" />
    </svg>
);

// TODO: Generate these
export const taskCoord = '0x' + BigInt.asUintN(32, BigInt(keccak256UTF8(TaskKinds.coord))).toString(16);
export const taskMessage = '0x' + BigInt.asUintN(32, BigInt(keccak256UTF8(TaskKinds.message))).toString(16);
export const taskInventory = '0x' + BigInt.asUintN(32, BigInt(keccak256UTF8(TaskKinds.inventory))).toString(16);
export const taskCombat = '0x' + BigInt.asUintN(32, BigInt(keccak256UTF8(TaskKinds.combat))).toString(16);
export const taskCombatWinAttack =
    '0x' + BigInt.asUintN(32, BigInt(keccak256UTF8(TaskKinds.combatWinAttack))).toString(16);
export const taskCombatWinDefense =
    '0x' + BigInt.asUintN(32, BigInt(keccak256UTF8(TaskKinds.combatWinDefense))).toString(16);
export const taskQuestAccept = '0x' + BigInt.asUintN(32, BigInt(keccak256UTF8(TaskKinds.questAccept))).toString(16);
export const taskQuestComplete = '0x' + BigInt.asUintN(32, BigInt(keccak256UTF8(TaskKinds.questComplete))).toString(16);

type Location = ReturnType<typeof getCoords>;

const FocusButton: FunctionComponent<{
    location: Locatable;
    setFocusLocation: ReturnType<typeof useState<Location>>[1];
}> = ({ location, setFocusLocation }) => {
    return (
        <div
            className="focusButton"
            onClick={() => {
                setFocusLocation(getCoords(location));
            }}
        >
            {targetSvg}
        </div>
    );
};

export interface QuestPanelProps {
    player: ConnectedPlayer;
}

export const QuestPanel: FunctionComponent<QuestPanelProps> = ({ player }: QuestPanelProps) => {
    const questMessages = useQuestMessages(5);
    const acceptedQuests =
        player.quests?.filter((q) => q.status == QUEST_STATUS_ACCEPTED).sort((a, b) => a.key - b.key) || [];
    const [focusLocation, setFocusLocation] = useState<Location>();
    const [allCompleted, setAllCompleted] = useState<boolean | undefined>(true);
    const { ready: mapReady, sendMessage } = useUnityMap();

    useEffect(() => {
        if (!focusLocation) return;
        if (!mapReady) return;
        if (!sendMessage) return;

        sendMessage('MapCamera', 'FocusTile', JSON.stringify(focusLocation));
    }, [focusLocation, mapReady, sendMessage]);

    const onCompleteClick = (quest: QuestFragment) => {
        player
            .dispatch({
                name: 'COMPLETE_QUEST',
                args: [quest.node.id, quest.key],
            })
            .catch((e) => {
                console.error('Failed to complete quest', quest, e);
            });
    };

    return (
        <>
            {acceptedQuests.length > 0 && (
                <Panel>
                    <h1>Q.U.E.S.T.s</h1>
                    {[acceptedQuests[0]].map((quest, questIdx) => (
                        <div className="questItem" key={questIdx}>
                            <div className="header">
                                <h2>{quest.node.name?.value}</h2>
                                {quest.node.location && (
                                    <FocusButton location={quest.node.location} setFocusLocation={setFocusLocation} />
                                )}
                            </div>
                            <p>{quest.node.description?.value}</p>
                            <div className="taskContainer">
                                {quest.node.tasks
                                    .sort((a, b) => a.key - b.key)
                                    .map((task, idx) => (
                                        <TaskItem
                                            key={idx}
                                            isFirst={idx == 0}
                                            task={task}
                                            player={player}
                                            questMessages={questMessages}
                                            setAllCompleted={setAllCompleted}
                                        />
                                    ))}
                            </div>
                            {allCompleted && (
                                <div className="buttonContainer">
                                    <button
                                        onClick={() => onCompleteClick(quest)}
                                        className="action-icon-button completeQuestButton"
                                    >
                                        Complete Quest
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </Panel>
            )}
        </>
    );
};

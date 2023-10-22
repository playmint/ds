import {
    BuildingKindFragment,
    ConnectedPlayer,
    QUEST_STATUS_ACCEPTED,
    QuestFragment,
    WorldStateFragment,
    WorldTileFragment,
} from '@app/../../core/src';
import styled from 'styled-components';
import { FunctionComponent, useCallback, useEffect, useMemo, useState } from 'react';
import { Locatable, getCoords } from '@app/helpers/tile';
import { useBuildingKinds, useQuestMessages } from '@app/hooks/use-game-state';
import { useUnityMap } from '@app/hooks/use-unity-map';
import { TaskItem } from '../quest-task/task-item';

const Panel = styled.div`
    background: #143063;
    color: #fff;
    padding: 2rem 2rem;
    width: 52rem;
    position: absolute;

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

export const QuestItem: FunctionComponent<{
    expanded: boolean;
    quest: QuestFragment;
    world: WorldStateFragment;
    tiles: WorldTileFragment[];
    player: ConnectedPlayer;
    buildingKinds: BuildingKindFragment[];
    setFocusLocation: ReturnType<typeof useState<Location>>[1];
    onExpandClick: (questId: string) => void;
}> = ({ expanded, world, tiles, player, buildingKinds, quest, setFocusLocation, onExpandClick }) => {
    const questMessages = useQuestMessages(5);
    const [taskCompletion, setTaskCompletion] = useState<{ [key: string]: boolean }>({});
    const [allCompleted, setAllCompleted] = useState<boolean>(false);

    useEffect(() => {
        if (!taskCompletion) return;
        if (!setAllCompleted) return;

        const allCompleted = quest.node.tasks.reduce(
            (isCompleted, t) => !!(isCompleted && taskCompletion && taskCompletion[t.node.id]),
            true
        );

        setAllCompleted(allCompleted);
    }, [quest, taskCompletion, setAllCompleted]);

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
        <div className="questItem">
            <div className="header" onClick={expanded ? undefined : () => onExpandClick(quest.node.id)}>
                <h2>
                    {expanded ? `[-]` : `[+]`} {quest.node.name?.value}
                </h2>
                {quest.node.location && (
                    <FocusButton location={quest.node.location} setFocusLocation={setFocusLocation} />
                )}
            </div>
            {expanded && (
                <>
                    <p>{quest.node.description?.value}</p>
                    <div className="taskContainer">
                        {quest.node.tasks
                            .sort((a, b) => a.key - b.key)
                            .map((task, idx) => (
                                <TaskItem
                                    tiles={tiles}
                                    key={idx}
                                    task={task}
                                    world={world}
                                    buildingKinds={buildingKinds}
                                    player={player}
                                    questMessages={questMessages}
                                    setTaskCompletion={setTaskCompletion}
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
                </>
            )}
        </div>
    );
};

export interface QuestPanelProps {
    player: ConnectedPlayer;
    world: WorldStateFragment;
    tiles: WorldTileFragment[];
}

export const QuestPanel: FunctionComponent<QuestPanelProps> = ({ world, tiles, player }: QuestPanelProps) => {
    const { ready: mapReady, sendMessage } = useUnityMap();
    const buildingKinds = useBuildingKinds();
    const [expandedQuest, setExpandedQuest] = useState<string>();

    const acceptedQuests = useMemo(() => {
        return player.quests?.filter((q) => q.status == QUEST_STATUS_ACCEPTED).sort((a, b) => a.key - b.key) || [];
    }, [player.quests]);

    useEffect(() => {
        if (!acceptedQuests) return;
        if (acceptedQuests.length === 0) return;

        // Set to the first if no quests expanded
        if (!expandedQuest) {
            setExpandedQuest(acceptedQuests[0].node.id);
        }

        // Set to first quest if quest that was expanded is no longer in the list
        if (!acceptedQuests.some((q) => q.node.id == expandedQuest)) {
            setExpandedQuest(acceptedQuests[0].node.id);
        }
    }, [expandedQuest, acceptedQuests]);

    // TODO: Make this a callback
    const [focusLocation, setFocusLocation] = useState<Location>();
    useEffect(() => {
        if (!focusLocation) return;
        if (!mapReady) return;
        if (!sendMessage) return;

        sendMessage('MapCamera', 'FocusTile', JSON.stringify(focusLocation));
    }, [focusLocation, mapReady, sendMessage]);

    const onExpandClick = useCallback(
        (questId: string) => {
            if (!setExpandedQuest) return;
            setExpandedQuest(questId);
        },
        [setExpandedQuest]
    );

    return (
        <>
            {acceptedQuests.length > 0 && (
                <Panel>
                    <h1>Q.U.E.S.T.s</h1>
                    {acceptedQuests.map((quest, questIdx) => (
                        <QuestItem
                            tiles={tiles}
                            expanded={(!expandedQuest && questIdx == 0) || expandedQuest == quest.node.id}
                            key={questIdx}
                            quest={quest}
                            player={player}
                            world={world}
                            buildingKinds={buildingKinds || []}
                            setFocusLocation={setFocusLocation}
                            onExpandClick={onExpandClick}
                        />
                    ))}
                </Panel>
            )}
        </>
    );
};

import {
    BuildingKindFragment,
    ConnectedPlayer,
    Log,
    QuestFragment,
    WorldStateFragment,
    WorldTileFragment,
} from '@app/../../core/src';
import { Locatable, getCoords } from '@app/helpers/tile';
import { useBuildingKinds } from '@app/hooks/use-game-state';
import { useUnityMap } from '@app/hooks/use-unity-map';
import { BasePanelStyles } from '@app/styles/base-panel.styles';
import { ActionButton } from '@app/styles/button.styles';
import { colorMap, colors } from '@app/styles/colors';
import { FunctionComponent, useCallback, useEffect, useState } from 'react';
import styled, { css } from 'styled-components';
import { TaskItem } from '../quest-task/task-item';
import { TaskView } from '../quest-task/task-view';

// NOTE: QuestPanel is a misnomer as it is no longer a panel but just a container. Each of the quest items are panels in their own right
const StyledQuestPanel = styled.div`
    width: 43.5rem;
    position: relative;
    overflow-y: auto;
    max-height: calc(100vh - 35rem);
    pointer-events: all;
`;

const CompleteQuestButton = styled(ActionButton)`
    color: ${colors.green_0};
    background: ${colors.grey_5};

    &:hover {
        background: ${colors.green_0};
        color: ${colors.grey_5};
        opacity: 1;
    }

    &:active {
        background: ${colors.green_1};
        color: ${colors.grey_5};
    }
`;

const targetSvg = (
    <svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 512 512">
        <path d="M448 256A192 192 0 1 0 64 256a192 192 0 1 0 384 0zM0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256zm256 80a80 80 0 1 0 0-160 80 80 0 1 0 0 160zm0-224a144 144 0 1 1 0 288 144 144 0 1 1 0-288zM224 256a32 32 0 1 1 64 0 32 32 0 1 1 -64 0z" />
    </svg>
);

type Location = ReturnType<typeof getCoords>;

const StyledFocusButton = styled.div`
    position: absolute;
    cursor: pointer;
    top: 1rem;
    right: 1rem;
    width: 3rem;
    height: 3rem;
    background-color: ${colorMap.primaryBackground};
    border-radius: 1rem;
    padding: 0.3rem;
    display: flex;
    align-items: center;
    justify-content: center;

    > svg {
        fill: ${colorMap.primaryText};
        width: 80%;
        height: 80%;
    }
`;

const FocusButton: FunctionComponent<{
    location: Locatable;
    setFocusLocation: ReturnType<typeof useState<Location>>[1];
}> = ({ location, setFocusLocation }) => {
    return (
        <StyledFocusButton
            onClick={() => {
                setFocusLocation(getCoords(location));
            }}
        >
            {targetSvg}
        </StyledFocusButton>
    );
};

const QuestItemStyles = ({ expanded }: { expanded: boolean }) => css`
    position: relative;
    padding: ${expanded ? 0 : `1rem`};
    overflow: hidden;
    margin-bottom: 0.5rem;

    ${!expanded &&
    css`
        &:hover {
            background: ${colorMap.secondaryBackground};
        }
    `}

    cursor: ${expanded ? `default` : `pointer`};

    h3 {
        margin: 0;
    }

    .header {
        background: ${colorMap.secondaryBackground};
        padding: var(--panel-padding);

        p {
            font-size: 1.3rem;
            color: ${colors.grey_3};
        }
    }

    /* Progress bar */

    .progress {
        width: 100%;
        display: flex;
        flex-direction: row;
        margin-top: 0.5rem;

        .progressText {
            margin-left: 1.5rem;
            font-weight: 700;
            font-size: 1.2rem;
        }

        .progressBar {
            flex-grow: 1;
        }
    }

    ${!expanded &&
    css`
        .progressBar {
            background-color: ${colors.grey_1};

            .inner {
                background: ${colors.grey_0};
                border-color: ${colors.grey_2};
            }
        }

        &:hover {
            .progressBar {
                background-color: ${colors.grey_2};

                .inner {
                    background: ${colors.grey_0};
                    border-color: ${colors.grey_2};
                }
            }
        }
    `}

    /* Tasks */

    .taskContainer {
        font-size: 1.4rem;
        padding: var(--panel-padding) var(--panel-padding) 0 var(--panel-padding);
    }

    .buttonContainer {
        margin: var(--panel-padding) 0;
        display: flex;
        justify-content: center;
    }

    .buttonContainer .completeQuestButton {
        width: 30rem;
    }
`;

const StyledProgressBar = styled.div`
    ${({ p }: { p: number }) => css`
        position: relative;
        background-color: white;
        border-radius: 1rem;
        background-color: ${colors.grey_2};

        > .inner {
            position: absolute;
            height: 100%;
            width: ${p * 100}%;
            border-radius: 1rem;
            border-width: 0.2rem;
            border-style: ${p > 0 ? `solid` : `none`};

            background-color: ${p >= 0.99 ? colors.green_0 + `!important` : colors.orange_0};
            border-color: ${p >= 0.99 ? colors.green_1 + `!important` : colors.orange_1};

            transition: width 0.5s;
        }
    `}
`;

const ProgressBar: FunctionComponent<{ p: number; className: string }> = ({ p, className }) => {
    return (
        <StyledProgressBar className={className} p={p}>
            <div className="inner"></div>
        </StyledProgressBar>
    );
};

const StyledQuestItem = styled.div`
    ${BasePanelStyles}
    ${QuestItemStyles}
`;

export const QuestItem: FunctionComponent<{
    expanded: boolean;
    quest: QuestFragment;
    world: WorldStateFragment;
    tiles: WorldTileFragment[];
    player: ConnectedPlayer;
    buildingKinds: BuildingKindFragment[];
    questMessages?: Log[];
    setFocusLocation: ReturnType<typeof useState<Location>>[1];
    onExpandClick: (questId: string) => void;
}> = ({ expanded, world, tiles, player, buildingKinds, quest, questMessages, setFocusLocation, onExpandClick }) => {
    const [taskCompletion, setTaskCompletion] = useState<{ [key: string]: boolean }>({});
    const [allCompleted, setAllCompleted] = useState<boolean>(false);
    const [completionCount, setCompletionCount] = useState<number>(0);
    const [completionPerc, setCompletionPerc] = useState<number>(0);

    useEffect(() => {
        if (!taskCompletion) return;
        if (!setAllCompleted) return;

        const completionCount = quest.node.tasks.reduce(
            (count, t) => (taskCompletion && taskCompletion[t.node.id] ? count + 1 : count),
            0
        );
        setCompletionCount(completionCount);

        setAllCompleted(completionCount === quest.node.tasks.length);
        setCompletionPerc(quest.node.tasks.length > 0 ? completionCount / quest.node.tasks.length : 0);
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
        <StyledQuestItem expanded={expanded} onClick={expanded ? undefined : () => onExpandClick(quest.node.id)}>
            {/* TaskItems are memos that eval the completion. */}
            {quest.node.tasks
                .sort((a, b) => a.key - b.key)
                .map((task, idx) => (
                    <TaskItem
                        key={idx}
                        tiles={tiles}
                        task={task}
                        world={world}
                        buildingKinds={buildingKinds}
                        player={player}
                        questMessages={questMessages}
                        setTaskCompletion={setTaskCompletion}
                    />
                ))}

            {expanded ? (
                <>
                    <div className="header">
                        <h3>{quest.node.name?.value}</h3>
                        {quest.node.location && (
                            <FocusButton location={quest.node.location} setFocusLocation={setFocusLocation} />
                        )}
                        <p>{quest.node.description?.value}</p>
                        <div className="progress">
                            <ProgressBar p={completionPerc} className="progressBar" />
                            <div className="progressText">
                                {completionCount}/{quest.node.tasks.length}
                            </div>
                        </div>
                    </div>

                    <div className="taskContainer">
                        {quest.node.tasks
                            .sort((a, b) => a.key - b.key)
                            .map((task, idx) => (
                                <TaskView key={idx} task={task.node} isCompleted={taskCompletion[task.node.id]} />
                            ))}
                    </div>
                    {allCompleted && (
                        <div className="buttonContainer">
                            <CompleteQuestButton onClick={() => onCompleteClick(quest)} className="completeQuestButton">
                                Complete Quest
                            </CompleteQuestButton>
                        </div>
                    )}
                </>
            ) : (
                <>
                    <h4>{quest.node.name?.value}</h4>
                    <div className="progress">
                        <ProgressBar p={completionPerc} className="progressBar" />
                        <div className="progressText">
                            {completionCount}/{quest.node.tasks.length}
                        </div>
                    </div>
                </>
            )}
        </StyledQuestItem>
    );
};

export interface QuestPanelProps {
    player: ConnectedPlayer;
    world: WorldStateFragment;
    tiles: WorldTileFragment[];
    acceptedQuests: QuestFragment[];
    questMessages?: Log[];
}

export const QuestPanel: FunctionComponent<QuestPanelProps> = ({
    world,
    tiles,
    player,
    acceptedQuests,
    questMessages,
}: QuestPanelProps) => {
    const { ready: mapReady, sendMessage } = useUnityMap();
    const buildingKinds = useBuildingKinds();
    const [expandedQuest, setExpandedQuest] = useState<string>();

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
        <StyledQuestPanel className="no-scrollbars">
            {acceptedQuests.map((quest, questIdx) => (
                <QuestItem
                    tiles={tiles}
                    expanded={(!expandedQuest && questIdx == 0) || expandedQuest == quest.node.id}
                    key={questIdx}
                    quest={quest}
                    player={player}
                    world={world}
                    buildingKinds={buildingKinds || []}
                    questMessages={questMessages}
                    setFocusLocation={setFocusLocation}
                    onExpandClick={onExpandClick}
                />
            ))}
        </StyledQuestPanel>
    );
};

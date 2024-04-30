import {
    BuildingKindFragment,
    ConnectedPlayer,
    Log,
    AssignedQuestFragment,
    ZoneWithBags,
    WorldTileFragment,
    QUEST_STATUS_COMPLETED,
    QUEST_STATUS_ACCEPTED,
} from '@app/../../core/src';
import { Locatable, getCoords } from '@app/helpers/tile';
import { useGlobal } from '@app/hooks/use-game-state';
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
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
        <g filter="url(#filter0_b_438_3013)">
            <path
                d="M12 2.3094C13.9521 1.18234 14.9282 0.618802 16 0.618802C17.0718 0.618802 18.0479 1.18234 20 2.3094L25.8564 5.6906C27.8085 6.81767 28.7846 7.3812 29.3205 8.3094C29.8564 9.2376 29.8564 10.3647 29.8564 12.6188V19.3812C29.8564 21.6353 29.8564 22.7624 29.3205 23.6906C28.7846 24.6188 27.8085 25.1823 25.8564 26.3094L20 29.6906C18.0479 30.8177 17.0718 31.3812 16 31.3812C14.9282 31.3812 13.9521 30.8177 12 29.6906L6.14359 26.3094C4.19146 25.1823 3.21539 24.6188 2.67949 23.6906C2.14359 22.7624 2.14359 21.6353 2.14359 19.3812V12.6188C2.14359 10.3647 2.14359 9.2376 2.67949 8.3094C3.21539 7.3812 4.19146 6.81767 6.14359 5.6906L12 2.3094Z"
                fill="#F7F5FA"
            />
        </g>
        <path
            d="M16 13.8184V8.00018M16 24.0002V18.182M13.8182 16.0002H8M24 16.0002H18.1818M21.0909 16.0002C21.0909 18.8118 18.8116 21.0911 16 21.0911C13.1884 21.0911 10.9091 18.8118 10.9091 16.0002C10.9091 13.1886 13.1884 10.9093 16 10.9093C18.8116 10.9093 21.0909 13.1886 21.0909 16.0002Z"
            stroke="#0D090F"
            strokeWidth="1"
        />
        <defs>
            <filter
                id="filter0_b_438_3013"
                x="-13.8564"
                y="-15.3812"
                width="59.7129"
                height="62.7625"
                filterUnits="userSpaceOnUse"
                colorInterpolationFilters="sRGB"
            >
                <feFlood floodOpacity="0" result="BackgroundImageFix" />
                <feGaussianBlur in="BackgroundImageFix" stdDeviation="8" />
                <feComposite in2="SourceAlpha" operator="in" result="effect1_backgroundBlur_438_3013" />
                <feBlend mode="normal" in="SourceGraphic" in2="effect1_backgroundBlur_438_3013" result="shape" />
            </filter>
        </defs>
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
    display: flex;
    align-items: center;
    justify-content: center;

    > svg {
        width: 3rem;
        height: 3rem;
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
        overflow: hidden;

        > .inner {
            position: absolute;
            height: 100%;
            width: ${Math.max(p, 0.05) * 100}%;
            border-radius: 1rem;
            border: 0.2rem solid;

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
    quest: AssignedQuestFragment;
    zone: ZoneWithBags;
    tiles: WorldTileFragment[];
    player: ConnectedPlayer;
    buildingKinds: BuildingKindFragment[];
    questMessages?: Log[];
    setFocusLocation: ReturnType<typeof useState<Location>>[1];
    onExpandClick: (questId: string) => void;
}> = ({ expanded, zone, tiles, player, buildingKinds, quest, questMessages, setFocusLocation, onExpandClick }) => {
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

    const onCompleteClick = (quest: AssignedQuestFragment) => {
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
                        zone={zone}
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

export const AutoQuestItem: FunctionComponent<{
    id: string;
    questName: string;
    player: ConnectedPlayer;
}> = ({ id, questName, player }) => {
    const onAcceptClick = () => {
        player
            .dispatch({
                name: 'ACCEPT_QUEST',
                args: [id, 0],
            })
            .catch((e) => {
                console.error('Failed to accept quest', questName, e);
            });
    };

    return (
        <StyledQuestItem expanded={true}>
            <>
                <div className="header">
                    <h3>{questName}</h3>
                </div>

                <div className="buttonContainer">
                    <CompleteQuestButton onClick={() => onAcceptClick()} className="completeQuestButton">
                        Accept Quest
                    </CompleteQuestButton>
                </div>
            </>
        </StyledQuestItem>
    );
};

export interface QuestPanelProps {
    player: ConnectedPlayer;
    zone: ZoneWithBags;
    tiles: WorldTileFragment[];
    acceptedQuests: AssignedQuestFragment[];
    questMessages?: Log[];
}

export const QuestPanel: FunctionComponent<QuestPanelProps> = ({
    zone,
    tiles,
    player,
    acceptedQuests,
    questMessages,
}: QuestPanelProps) => {
    const { ready: mapReady, sendMessage } = useUnityMap();
    const global = useGlobal();
    const buildingKinds = global?.buildingKinds || [];
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
            {acceptedQuests.length === 0 &&
                zone?.autoquests
                    .filter(
                        (autoquests) =>
                            !player?.zone?.quests.some(
                                (quest) =>
                                    quest.node.id === autoquests.id &&
                                    (quest.status === QUEST_STATUS_COMPLETED || quest.status === QUEST_STATUS_ACCEPTED)
                            )
                    )
                    .map((autoquest) => (
                        <AutoQuestItem
                            key={autoquest.id}
                            id={autoquest.id || ''}
                            questName={autoquest.name?.value || ''}
                            player={player}
                        />
                    ))}

            {acceptedQuests.map((quest, questIdx) => (
                <QuestItem
                    tiles={tiles}
                    expanded={(!expandedQuest && questIdx == 0) || expandedQuest == quest.node.id}
                    key={questIdx}
                    quest={quest}
                    player={player}
                    zone={zone}
                    buildingKinds={buildingKinds || []}
                    questMessages={questMessages}
                    setFocusLocation={setFocusLocation}
                    onExpandClick={onExpandClick}
                />
            ))}
        </StyledQuestPanel>
    );
};

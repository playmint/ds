import { ConnectedPlayer } from '@app/../../core/src';
import styled, { css } from 'styled-components';
import { FunctionComponent, useCallback, useEffect, useState } from 'react';
import { getCoords } from '@app/helpers/tile';
import { useUnityMap } from '@app/hooks/use-unity-map';
import { BasePanelStyles } from '@app/styles/base-panel.styles';
import { ActionButton } from '@app/styles/button.styles';
import { colorMap, colors } from '@app/styles/colors';
import { Quest, useQuestState } from '@app/hooks/use-quest-state';
import { TaskView } from '../quest-task/task-view';

type Location = ReturnType<typeof getCoords>;

// NOTE: QuestPanel is a misnomer as it is no longer a panel but just a container. Each of the quest items are panels in their own right
const StyledQuestPanel = styled.div`
    width: 43.5rem;
    position: absolute;
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
    location: Location;
    setFocusLocation: ReturnType<typeof useState<Location>>[1];
}> = ({ location, setFocusLocation }) => {
    return (
        <StyledFocusButton
            onClick={() => {
                setFocusLocation(location);
            }}
        >
            {targetSvg}
        </StyledFocusButton>
    );
};

const QuestItemStyles = ({ expanded }: { expanded: boolean }) => css`
    position: relative;
    padding: ${expanded ? 0 : `var(--panel-padding)`};
    overflow: hidden;
    margin-bottom: 0.5rem;

    ${!expanded &&
    `&:hover {
        background: ${colorMap.secondaryBackground};
    }`}

    cursor: ${expanded ? `default` : `pointer`};

    h3 {
        margin: 0;
    }

    .header {
        background: ${colorMap.secondaryBackground};
        padding: var(--panel-padding);

        p {
            color: ${colors.grey_3};
        }
    }

    .taskContainer {
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

const StyledQuestItem = styled.div`
    ${BasePanelStyles}
    ${QuestItemStyles}
`;

export interface QuestPanelProps {
    player: ConnectedPlayer;
}

export const QuestPanel: FunctionComponent<QuestPanelProps> = ({ player }) => {
    const { ready: mapReady, sendMessage } = useUnityMap();
    const { acceptedQuests } = useQuestState();
    const [expandedQuest, setExpandedQuest] = useState<string>();

    useEffect(() => {
        if (!acceptedQuests) return;
        if (acceptedQuests.length === 0) return;

        // Set to the first if no quests expanded
        if (!expandedQuest) {
            setExpandedQuest(acceptedQuests[0].id);
        }

        // Set to first quest if quest that was expanded is no longer in the list
        if (!acceptedQuests.some((q) => q.id == expandedQuest)) {
            setExpandedQuest(acceptedQuests[0].id);
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

    const handleExpandClick = useCallback(
        (questId: string) => {
            if (!setExpandedQuest) return;
            setExpandedQuest(questId);
        },
        [setExpandedQuest]
    );

    return (
        <>
            {acceptedQuests && acceptedQuests.length > 0 && (
                <StyledQuestPanel>
                    {acceptedQuests.map((quest, questIdx) => (
                        <QuestItem
                            expanded={expandedQuest === quest.id}
                            key={questIdx}
                            quest={quest}
                            player={player}
                            setFocusLocation={setFocusLocation}
                            onExpandClick={handleExpandClick}
                        />
                    ))}
                </StyledQuestPanel>
            )}
        </>
    );
};

export interface QuestItemProps {
    expanded: boolean;
    quest: Quest;
    player: ConnectedPlayer;
    setFocusLocation: ReturnType<typeof useState<Location>>[1];
    onExpandClick: (questId: string) => void;
}

export const QuestItem: FunctionComponent<QuestItemProps> = ({
    expanded,
    player,
    quest,
    setFocusLocation,
    onExpandClick,
}) => {
    const allTasksCompleted = quest.tasks.every((t) => t.isCompleted);

    const onCompleteClick = (quest: Quest) => {
        player
            .dispatch({
                name: 'COMPLETE_QUEST',
                args: [quest.id, quest.key],
            })
            .catch((e) => {
                console.error('Failed to complete quest', quest, e);
            });
    };

    return (
        <StyledQuestItem expanded={expanded} onClick={expanded ? undefined : () => onExpandClick(quest.id)}>
            {expanded ? (
                <>
                    <div className="header">
                        <h2>{quest.name}</h2>
                        {quest.location && (
                            <FocusButton location={quest.location} setFocusLocation={setFocusLocation} />
                        )}
                        <p>{quest.description}</p>
                    </div>

                    <div className="taskContainer">
                        {quest.tasks.map((task, idx) => (
                            <TaskView key={idx} task={task} />
                        ))}
                    </div>
                    {allTasksCompleted && (
                        <div className="buttonContainer">
                            <CompleteQuestButton onClick={() => onCompleteClick(quest)} className="completeQuestButton">
                                Complete Quest
                            </CompleteQuestButton>
                        </div>
                    )}
                </>
            ) : (
                <h3>{quest.name}</h3>
            )}
        </StyledQuestItem>
    );
};

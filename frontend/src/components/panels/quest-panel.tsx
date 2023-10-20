import {
    BuildingKindFragment,
    ConnectedPlayer,
    QUEST_STATUS_ACCEPTED,
    QuestFragment,
    WorldStateFragment,
    WorldTileFragment,
} from '@app/../../core/src';
import styled, { css } from 'styled-components';
import { FunctionComponent, useCallback, useEffect, useMemo, useState } from 'react';
import { Locatable, getCoords } from '@app/helpers/tile';
import { useBuildingKinds, useQuestMessages } from '@app/hooks/use-game-state';
import { useUnityMap } from '@app/hooks/use-unity-map';
import { TaskItem } from '../quest-task/task-item';
import { BasePanelStyles } from '@app/styles/base-panel.styles';
import { ActionButton } from '@app/styles/button.styles';
import { colorMap, colors } from '@app/styles/colors';

// NOTE: QuestPanel is a misnomer as it is no longer a panel but just a container. Each of the quest items are panels in their own right
const StyledQuestPanel = styled.div`
    width: 43.5rem;
    position: absolute;
`;

const CompleteQuestButton = styled(ActionButton)`
    color: ${colors.green_0};
    background: ${colors.grey_4};

    &:hover,
    &.active {
        background: ${colors.green_0};
        color: ${colors.grey_4};
        opacity: 1;
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
        <StyledQuestItem expanded={expanded} onClick={expanded ? undefined : () => onExpandClick(quest.node.id)}>
            {expanded ? (
                <>
                    <div className="header">
                        <h2>{quest.node.name?.value}</h2>
                        {quest.node.location && (
                            <FocusButton location={quest.node.location} setFocusLocation={setFocusLocation} />
                        )}
                        <p>{quest.node.description?.value}</p>
                    </div>

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
                            <CompleteQuestButton onClick={() => onCompleteClick(quest)} className="completeQuestButton">
                                Complete Quest
                            </CompleteQuestButton>
                        </div>
                    )}
                </>
            ) : (
                <h3>{quest.node.name?.value}</h3>
            )}
        </StyledQuestItem>
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
                <StyledQuestPanel>
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
                </StyledQuestPanel>
            )}
        </>
    );
};

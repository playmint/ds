import { PluginType, QuestFragment, SelectedPlayerFragment } from '@app/../../core/src';
import { usePluginState } from '@app/hooks/use-game-state';
import { PluginContent } from '../organisms/tile-action';
import styled from 'styled-components';
import { FunctionComponent } from 'react';

const Panel = styled.div`
    background: #143063;
    color: #fff;
    padding: 2rem 2rem;
    margin-bottom: 1.2rem;
`;

export interface QuestProps {
    quests: QuestFragment[];
}

export const ACCEPTED = 1;
export const COMPLETED = 2;

export const QuestPanel: FunctionComponent<QuestProps> = ({ quests }: QuestProps) => {
    const acceptedQuests = quests.filter((q) => q.status == ACCEPTED).sort((a, b) => a.key - b.key);

    return (
        <>
            {acceptedQuests.length > 0 && (
                <Panel>
                    <h1>Quests</h1>
                    {[acceptedQuests[0]].map((quest, idx) => (
                        <>
                            <h2 key={idx}>{quest.node.name?.value}</h2>
                            <h3 key={`taskHeader/${idx}`}>Tasks:</h3>
                            {quest.node.tasks.map((task, idx) => (
                                <p key={idx}>{task.task.name?.value}</p>
                            ))}
                        </>
                    ))}
                </Panel>
            )}
        </>
    );
};

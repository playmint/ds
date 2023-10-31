/** @format */

import { CogAction, ConnectedPlayer, WorldStateFragment } from '@app/../../core/src';
import { Combat, CombatWinState, MAX_TICKS } from '@app/plugins/combat/combat';
import { CombatParticipant, CombatParticipantProps } from '@app/plugins/combat/combat-participant';
import {
    CombatSession,
    convertCombatActions,
    entityStateToCombatParticipantProps,
    getActions,
    sumParticipants,
} from '@app/plugins/combat/helpers';
import { ProgressBar } from '@app/plugins/combat/progress-bar';
import { TickTimerProgressBar } from '@app/plugins/combat/tick-timer-progress-bar';
import { ComponentProps } from '@app/types/component-props';
import { WorldCombatSessionFragment } from '@downstream/core/src/gql/graphql';
import { Fragment, FunctionComponent, useMemo } from 'react';
import styled from 'styled-components';
import { styles } from './combat-modal.styles';
import { ActionButton } from '@app/styles/button.styles';

export type CombatModalProps = ComponentProps & {
    world: WorldStateFragment;
    player: ConnectedPlayer;
    blockNumber: number;
    closeModal: () => void;
    session: WorldCombatSessionFragment;
};

type CombatParticipantsProps = {
    attackers: CombatParticipantProps[];
    defenders: CombatParticipantProps[];
};

type CombatParticipantSummaryProps = {
    attackersMaxHealth: number;
    attackersCurrentHealth: number;
    defendersMaxHealth: number;
    defendersCurrentHealth: number;
};

type CombatStateProps = CombatModalProps &
    CombatParticipantsProps &
    CombatParticipantSummaryProps & {
        blockNumber: number;
        blockTime: number;
        tickCount: number;
    };

type PostCombatStateProps = CombatModalProps &
    CombatParticipantsProps &
    CombatParticipantSummaryProps & {
        winState: CombatWinState;
        session: CombatSession;
        onFinaliseCombat: () => void;
    };

const StyledCombatModal = styled('div')`
    ${styles}
`;

const CombatParticipants: FunctionComponent<CombatParticipantsProps> = (props) => {
    const { attackers, defenders } = props;

    return (
        <Fragment>
            <div className="attackers">
                {attackers
                    .filter((participant) => participant.isPresent)
                    .map((participant, index) => (
                        <CombatParticipant key={index} {...participant} className="participant" />
                    ))}
            </div>
            <div className="defenders">
                {defenders
                    .filter((participant) => participant.isPresent)
                    .map((participant, index) => (
                        <CombatParticipant key={index} {...participant} className="participant" />
                    ))}
            </div>
        </Fragment>
    );
};

const CombatParticipantSummary: FunctionComponent<CombatParticipantSummaryProps> = (props) => {
    const { attackersMaxHealth, attackersCurrentHealth, defendersMaxHealth, defendersCurrentHealth } = props;

    return (
        <Fragment>
            <div className="attackers">
                <span className="heading">Attackers</span>
                <ProgressBar maxValue={attackersMaxHealth} currentValue={attackersCurrentHealth} />
            </div>
            <div className="defenders">
                <span className="heading">Defenders</span>
                <ProgressBar maxValue={defendersMaxHealth} currentValue={defendersCurrentHealth} />
            </div>
        </Fragment>
    );
};

const CombatState: FunctionComponent<CombatStateProps> = (props) => {
    const {
        attackers,
        attackersMaxHealth,
        attackersCurrentHealth,
        defenders,
        defendersMaxHealth,
        defendersCurrentHealth,
        tickCount,
    } = props;

    const secondsRemaining = (MAX_TICKS - tickCount) * 2;
    const timeRemaining = new Date(secondsRemaining * 1000).toISOString().slice(11, 19);

    return (
        <StyledCombatModal>
            <div className="header">
                <CombatParticipantSummary
                    attackersMaxHealth={attackersMaxHealth}
                    attackersCurrentHealth={attackersCurrentHealth}
                    defendersMaxHealth={defendersMaxHealth}
                    defendersCurrentHealth={defendersCurrentHealth}
                />
            </div>
            <div className="body">
                <CombatParticipants attackers={attackers} defenders={defenders} />
            </div>
            <div className="footer">
                <TickTimerProgressBar className="in-progress" every={2000} />
                <ProgressBar
                    maxValue={MAX_TICKS}
                    currentValue={MAX_TICKS - tickCount}
                    label={`TIME REMAINING ${timeRemaining}`}
                />
            </div>
        </StyledCombatModal>
    );
};

const PostCombatHeader: FunctionComponent<{ winState: CombatWinState }> = ({ winState }) => {
    switch (winState) {
        case CombatWinState.ATTACKERS:
            return (
                <div className="winner">
                    <span className="content">Attackers win!</span>
                </div>
            );
        case CombatWinState.DEFENDERS:
            return (
                <div className="winner">
                    <span className="content">Defenders win!</span>
                </div>
            );
        case CombatWinState.DRAW:
            return (
                <div className="winner">
                    <span className="content">Draw!</span>
                </div>
            );
        case CombatWinState.NONE:
        default:
            return (
                <div className="winner">
                    <span className="content"></span>
                </div>
            );
    }
};

const PostCombatFooter: FunctionComponent<{
    isFinalised: boolean;
    closeModal: () => void;
    finaliseCombat: () => void;
}> = ({ isFinalised, closeModal, finaliseCombat }) => {
    return isFinalised ? (
        <ActionButton onClick={closeModal}>Close Combat</ActionButton>
    ) : (
        <ActionButton onClick={finaliseCombat}>End Combat</ActionButton>
    );
};

const PostCombatState: FunctionComponent<PostCombatStateProps> = (props) => {
    const {
        closeModal,
        onFinaliseCombat,
        session,
        winState,
        attackers,
        attackersMaxHealth,
        attackersCurrentHealth,
        defenders,
        defendersMaxHealth,
        defendersCurrentHealth,
    } = props;

    return (
        <StyledCombatModal>
            <div className="header">
                <CombatParticipantSummary
                    attackersMaxHealth={attackersMaxHealth}
                    attackersCurrentHealth={attackersCurrentHealth}
                    defendersMaxHealth={defendersMaxHealth}
                    defendersCurrentHealth={defendersCurrentHealth}
                />
            </div>
            <div className="win-state">
                <PostCombatHeader winState={winState} />
            </div>
            <div className="body">
                <CombatParticipants attackers={attackers} defenders={defenders} />
            </div>
            <div className="footer">
                <PostCombatFooter
                    closeModal={closeModal}
                    finaliseCombat={onFinaliseCombat}
                    isFinalised={!!session.isFinalised}
                />
            </div>
        </StyledCombatModal>
    );
};

enum CombatModalState {
    Combat,
    PostCombat,
}

export const CombatModal: FunctionComponent<CombatModalProps> = (props: CombatModalProps) => {
    const { player, world, blockNumber, closeModal, session: latestSession } = props;
    const actions = latestSession && getActions(latestSession);
    const convertedActions = convertCombatActions(actions || []);
    const combat = new Combat(); // Is a class because it was converted from solidity
    const orderedListIndexes = combat.getOrderedListIndexes(convertedActions);
    const combatState = combat.calcCombatState(convertedActions, orderedListIndexes, blockNumber || 0);

    const handleFinaliseCombat = () => {
        if (!latestSession) {
            return;
        }
        if (!player) {
            return;
        }
        const action: CogAction = {
            name: 'FINALISE_COMBAT',
            args: [latestSession.id, actions, orderedListIndexes],
        };
        player
            .dispatchAndWait(action)
            .then(closeModal)
            .catch((err) => console.error(err));
    };

    // state transitions
    const combatModalState = useMemo(() => {
        if (latestSession && latestSession.isFinalised) {
            return CombatModalState.PostCombat;
        } else if (latestSession && !latestSession.isFinalised) {
            if (combatState.winState === CombatWinState.NONE) {
                return CombatModalState.Combat;
            } else {
                return CombatModalState.PostCombat;
            }
        } else {
            return null;
        }
    }, [combatState, latestSession]);

    const attackers: CombatParticipantProps[] = combatState.attackerStates.map((entity) =>
        entityStateToCombatParticipantProps(entity, world, player)
    );
    const [attackersMaxHealth, attackersCurrentHealth] = attackers.reduce(sumParticipants, [0, 0]);
    const defenders: CombatParticipantProps[] = combatState.defenderStates.map((entity) =>
        entityStateToCombatParticipantProps(entity, world, player)
    );
    const [defendersMaxHealth, defendersCurrentHealth] = defenders.reduce(sumParticipants, [0, 0]);

    // During combat
    if (combatModalState === CombatModalState.Combat) {
        return (
            <CombatState
                {...props}
                attackers={attackers}
                attackersMaxHealth={attackersMaxHealth}
                attackersCurrentHealth={attackersCurrentHealth}
                defenders={defenders}
                defendersMaxHealth={defendersMaxHealth}
                defendersCurrentHealth={defendersCurrentHealth}
                blockNumber={blockNumber || 0}
                blockTime={2}
                tickCount={combatState.tickCount}
            />
        );
    }

    // When combat has finished
    if (combatModalState === CombatModalState.PostCombat && latestSession) {
        return (
            <PostCombatState
                {...props}
                closeModal={closeModal}
                attackers={attackers}
                attackersMaxHealth={attackersMaxHealth}
                attackersCurrentHealth={attackersCurrentHealth}
                defenders={defenders}
                defendersMaxHealth={defendersMaxHealth}
                defendersCurrentHealth={defendersCurrentHealth}
                winState={combatState.winState}
                session={latestSession}
                onFinaliseCombat={handleFinaliseCombat}
            />
        );
    }

    return null;
};

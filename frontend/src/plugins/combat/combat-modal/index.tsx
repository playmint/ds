/** @format */

import { FunctionComponent, Fragment, useState, useEffect, useLayoutEffect } from 'react';
import styled from 'styled-components';
import { ComponentProps } from '@app/types/component-props';
import { styles } from './combat-modal.styles';
import { CombatParticipant, CombatParticipantProps } from '@app/plugins/combat/combat-participant';
import { ProgressBar } from '@app/plugins/combat/progress-bar';
import { TickTimerProgressBar } from '@app/plugins/combat/tick-timer-progress-bar';
import {
    BiomeKind,
    CogAction,
    ConnectedPlayer,
    SelectedMobileUnitFragment,
    SelectedTileFragment,
    useSelection,
    WorldStateFragment
} from '@downstream/core';
import {
    CombatSession,
    convertCombatActions,
    entityStateToCombatParticipantProps,
    getActions,
    getLatestSession,
    getTileEntities,
    sumParticipants
} from '@app/plugins/combat/helpers';
import { Combat, CombatWinState } from '@app/plugins/combat/combat';
import { useBlockTime } from '@app/contexts/block-time-provider';
import { useMounted } from '@app/hooks/use-mounted';

export type CombatModalProps = ComponentProps & {
    world: WorldStateFragment;
    player: ConnectedPlayer;
    isNewSession?: boolean;
    closeModal: () => void;
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

type PreCombatStateProps = CombatModalProps &
    CombatParticipantsProps &
    CombatParticipantSummaryProps & {
        selectedMobileUnit?: SelectedMobileUnitFragment;
        selectedTiles: SelectedTileFragment[];
        isStarted: boolean;
        onStartCombat: () => void;
    };

type CombatStateProps = CombatModalProps &
    CombatParticipantsProps &
    CombatParticipantSummaryProps & {
        selectedMobileUnit?: SelectedMobileUnitFragment;
        selectedTiles: SelectedTileFragment[];
        blockNumber: number;
        blockTime: number;
    };

type PostCombatStateProps = CombatModalProps &
    CombatParticipantsProps &
    CombatParticipantSummaryProps & {
        selectedMobileUnit?: SelectedMobileUnitFragment;
        selectedTiles: SelectedTileFragment[];
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

const PreCombatState: FunctionComponent<PreCombatStateProps> = (props) => {
    const {
        player,
        selectedMobileUnit,
        selectedTiles = [],
        closeModal,
        attackers,
        defenders,
        attackersMaxHealth,
        attackersCurrentHealth,
        defendersMaxHealth,
        defendersCurrentHealth,
        isStarted,
        onStartCombat
    } = props;

    const combatTiles = selectedTiles
        .filter((t) => t.biome === BiomeKind.DISCOVERED)
        .filter(({ sessions }) => {
            // cannot start combat if any of the tiles have an active session
            return sessions.filter((session: any) => !session.isFinalised).length == 0;
        });

    const startCombat = () => {
        if (!player) {
            return;
        }
        if (!selectedMobileUnit) {
            return;
        }
        if (combatTiles.length < 2) {
            return;
        }
        if (!combatTiles[1].building) {
            return;
        }

        const attackers = combatTiles[0].mobileUnits
            .map((s) => s.id)
            .concat(combatTiles[0].building ? [combatTiles[0].building.id] : []);
        const defenders = combatTiles[1].mobileUnits
            .map((s) => s.id)
            .concat(combatTiles[1].building ? [combatTiles[1].building.id] : []);

        const action: CogAction = {
            name: 'START_COMBAT',
            args: [selectedMobileUnit.id, combatTiles[1].id, attackers, defenders]
        };
        player.dispatch(action);
        onStartCombat();
    };

    return (
        <StyledCombatModal>
            <button onClick={closeModal} className="close-modal-button">
                <i className="bi bi-x" />
            </button>
            <div className="header">
                <img src="/combat-header.png" alt="" className="icon" />
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
                <button className="action-button" onClick={startCombat} disabled={isStarted}>
                    Start combat
                </button>
            </div>
        </StyledCombatModal>
    );
};

const CombatState: FunctionComponent<CombatStateProps> = (props) => {
    const {
        closeModal,
        attackers,
        attackersMaxHealth,
        attackersCurrentHealth,
        defenders,
        defendersMaxHealth,
        defendersCurrentHealth,
        blockNumber,
        blockTime
    } = props;

    return (
        <StyledCombatModal>
            <button onClick={closeModal} className="close-modal-button">
                <i className="bi bi-x" />
            </button>
            <div className="header">
                <img src="/combat-header.png" alt="" className="icon" />
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
                <TickTimerProgressBar className="in-progress" blockTime={blockTime} blockNumber={blockNumber} />
            </div>
        </StyledCombatModal>
    );
};

const PostCombatHeader: FunctionComponent<{ winState: CombatWinState }> = ({ winState }) => {
    switch (winState) {
        case CombatWinState.ATTACKERS:
            return (
                <div className="attackers-win">
                    <div className="winner">
                        <span className="content">Attackers win!</span>
                    </div>
                </div>
            );
        case CombatWinState.DEFENDERS:
            return (
                <div className="defenders-win">
                    <div className="winner">
                        <span className="content">Defenders win!</span>
                    </div>
                </div>
            );
        case CombatWinState.DRAW:
            return (
                <div className="draw">
                    <div className="winner">
                        <span className="content">Draw!</span>
                    </div>
                </div>
            );
        case CombatWinState.NONE:
        default:
            return <img src="/combat-header.png" alt="" className="icon" />;
    }
};

const PostCombatFooter: FunctionComponent<{
    isFinalised: boolean;
    closeModal: () => void;
    finaliseCombat: () => void;
}> = ({ isFinalised, closeModal, finaliseCombat }) => {
    const [ended, setEnded] = useState<boolean>(false);
    const isMounted = useMounted();

    const handleFinaliseCombat = () => {
        finaliseCombat && finaliseCombat();
        if (!isMounted()) {
            return;
        }
        setEnded(true);
    };

    if (ended && isFinalised) {
        closeModal();
        return null;
    }

    return isFinalised ? (
        <button onClick={closeModal} className="action-button">
            Close Combat
        </button>
    ) : (
        <button onClick={handleFinaliseCombat} className="action-button" disabled={ended}>
            End Combat
        </button>
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
        defendersCurrentHealth
    } = props;

    return (
        <StyledCombatModal>
            <button onClick={closeModal} className="close-modal-button">
                <i className="bi bi-x" aria-label="Close modal" />
            </button>
            <div className="header">
                <PostCombatHeader winState={winState} />
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
    PreCombat,
    Combat,
    PostCombat
}

export const CombatModal: FunctionComponent<CombatModalProps> = (props: CombatModalProps) => {
    const { player, world, isNewSession } = props;
    const [combatModalState, setCombatModalState] = useState<CombatModalState | null>(null);
    const { mobileUnit: selectedMobileUnit, tiles: selectedTiles = [] } = useSelection();
    const { blockNumberRef, blockTime } = useBlockTime();
    const [blockNumber, setBlockNumber] = useState<number>(blockNumberRef.current);
    const latestSession = getLatestSession(selectedTiles);
    const actions = latestSession && getActions(latestSession);

    const [dispatchComplete, setDispatchComplete] = useState<boolean>(false);
    const [latestSessionId, setLatestSessionId] = useState<string>();
    const [isStarted, setIsStarted] = useState(!isNewSession);

    const convertedActions = convertCombatActions(actions || []);
    const combat = new Combat(); // Is a class because it was converted from solidity
    const orderedListIndexes = combat.getOrderedListIndexes(convertedActions);
    const combatState = combat.calcCombatState(convertedActions, orderedListIndexes, blockNumber);

    const handleFinaliseCombat = () => {
        const action: CogAction = {
            name: 'FINALISE_COMBAT',
            args: [latestSession?.id, actions, orderedListIndexes]
        };
        player?.dispatch(action);
    };

    const handleStartCombat = () => {
        setLatestSessionId(latestSession?.id);
        setIsStarted(true);
    };

    // when the session is updated we check if the id is different from the session id
    // at the time combat was started, which let's us know the start combat dispatch is complete
    useEffect(() => {
        setDispatchComplete(isStarted && latestSessionId !== latestSession?.id);
    }, [latestSession, latestSessionId, isStarted]);

    // re-render every block setting the new block time so that combat states are updated
    useEffect(() => {
        const interval = setInterval(() => {
            setBlockNumber(blockNumberRef.current);
        }, blockTime);

        return () => clearInterval(interval);
    }, [blockNumberRef, blockTime]);

    // state transitions
    useLayoutEffect(() => {
        // figure out the state of the modal the first time it is opened
        if (combatModalState === null) {
            if (isNewSession) {
                setCombatModalState(CombatModalState.PreCombat);
                return;
            }
            if (combatState.winState === CombatWinState.NONE) {
                setCombatModalState(CombatModalState.Combat);
                return;
            }

            setCombatModalState(CombatModalState.PostCombat);
            return;
        }

        if (combatModalState === CombatModalState.PreCombat) {
            // transition to combat when combat is started and the dispatch is complete
            if (isStarted && dispatchComplete) {
                setCombatModalState(CombatModalState.Combat);
            }
            return;
        }

        if (combatModalState === CombatModalState.Combat) {
            if (combatState.winState !== CombatWinState.NONE) {
                setCombatModalState(CombatModalState.PostCombat);
            }
        }
    }, [isStarted, dispatchComplete, combatState?.winState, combatModalState, isNewSession]);

    // Before combat has started
    const notQuiteReady = combatModalState === CombatModalState.Combat && !combatState.attackerStates[0];
    if (combatModalState === CombatModalState.PreCombat || notQuiteReady) {
        const attackers: CombatParticipantProps[] = getTileEntities(selectedTiles[0], world, player);
        const [attackersMaxHealth, attackersCurrentHealth] = attackers.reduce(sumParticipants, [0, 0]);
        const defenders: CombatParticipantProps[] = getTileEntities(selectedTiles[1], world, player);
        const [defendersMaxHealth, defendersCurrentHealth] = defenders.reduce(sumParticipants, [0, 0]);
        return (
            <PreCombatState
                {...props}
                isStarted={isStarted}
                onStartCombat={handleStartCombat}
                selectedMobileUnit={selectedMobileUnit}
                selectedTiles={selectedTiles}
                attackers={attackers}
                attackersMaxHealth={attackersMaxHealth}
                attackersCurrentHealth={attackersCurrentHealth}
                defenders={defenders}
                defendersMaxHealth={defendersMaxHealth}
                defendersCurrentHealth={defendersCurrentHealth}
            />
        );
    }

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
                selectedMobileUnit={selectedMobileUnit}
                selectedTiles={selectedTiles}
                attackers={attackers}
                attackersMaxHealth={attackersMaxHealth}
                attackersCurrentHealth={attackersCurrentHealth}
                defenders={defenders}
                defendersMaxHealth={defendersMaxHealth}
                defendersCurrentHealth={defendersCurrentHealth}
                blockNumber={blockNumber}
                blockTime={blockTime}
            />
        );
    }

    // When combat has finished
    if (combatModalState === CombatModalState.PostCombat && latestSession) {
        return (
            <PostCombatState
                {...props}
                selectedMobileUnit={selectedMobileUnit}
                selectedTiles={selectedTiles}
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

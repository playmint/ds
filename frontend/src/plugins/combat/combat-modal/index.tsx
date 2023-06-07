/** @format */

import { FunctionComponent, Fragment, useState } from 'react';
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
    SelectedSeekerFragment,
    SelectedTileFragment,
    useSelection
} from '@dawnseekers/core';
import { buildingRegex, CombatSession, convertCombatActions, getActions } from '@app/plugins/combat/helpers';
import { ATOM_ATTACK, ATOM_DEFENSE, ATOM_LIFE, Combat, CombatWinState, EntityState } from '@app/plugins/combat/combat';
import { formatUnitKey } from '@app/helpers';
import { BytesLike, hexlify } from 'ethers';
import { useBlockTime } from '@app/contexts/block-time-provider';

export type CombatModalProps = ComponentProps & {
    selectedTiles: SelectedTileFragment[];
    player?: ConnectedPlayer;
    selectedSeeker?: SelectedSeekerFragment;
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

type PreCombatStateProps = CombatModalProps & CombatParticipantsProps & CombatParticipantSummaryProps;

type CombatStateProps = CombatModalProps &
    CombatParticipantsProps &
    CombatParticipantSummaryProps & {
        blockNumber: number;
        blockTime: number;
    };

type PostCombatStateProps = CombatModalProps &
    CombatParticipantsProps &
    CombatParticipantSummaryProps & {
        winState: CombatWinState;
        session: CombatSession;
        finaliseCombat: () => void;
    };

const StyledCombatModal = styled('div')`
    ${styles}
`;

const CombatParticipants: FunctionComponent<CombatParticipantsProps> = (props) => {
    const { attackers, defenders } = props;

    return (
        <Fragment>
            <div className="attackers">
                {attackers.map((participant, index) => (
                    <CombatParticipant key={index} {...participant} className="participant" />
                ))}
            </div>
            <div className="defenders">
                {defenders.map((participant, index) => (
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
        selectedTiles,
        player,
        selectedSeeker,
        closeModal,
        attackers,
        defenders,
        attackersMaxHealth,
        attackersCurrentHealth,
        defendersMaxHealth,
        defendersCurrentHealth
    } = props;

    const [started, setStarted] = useState<boolean>(false);

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
        if (!selectedSeeker) {
            return;
        }
        if (combatTiles.length < 2) {
            return;
        }
        if (!combatTiles[1].building) {
            return;
        }

        const attackers = combatTiles[0].seekers
            .map((s) => s.id)
            .concat(combatTiles[0].building ? [combatTiles[0].building.id] : []);
        const defenders = combatTiles[1].seekers
            .map((s) => s.id)
            .concat(combatTiles[1].building ? [combatTiles[1].building.id] : []);

        const action: CogAction = {
            name: 'START_COMBAT',
            args: [selectedSeeker.id, combatTiles[1].id, attackers, defenders]
        };
        player.dispatch(action);
        setStarted(true);
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
                <button className="action-button" onClick={startCombat} disabled={started}>
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

    const handleFinaliseCombat = () => {
        finaliseCombat && finaliseCombat();
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
        finaliseCombat,
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
                    finaliseCombat={finaliseCombat}
                    isFinalised={!!session.isFinalised}
                />
            </div>
        </StyledCombatModal>
    );
};

export const CombatModal: FunctionComponent<CombatModalProps> = (props: CombatModalProps) => {
    const { player } = props;
    const { seeker: selectedSeeker, tiles: selectedTiles = [] } = useSelection();
    const { blockNumber, blockTime } = useBlockTime();
    const latestSession =
        selectedTiles.length > 0 &&
        selectedTiles[0].sessions.length > 0 &&
        selectedTiles[0].sessions[selectedTiles[0].sessions.length - 1];
    const actions = latestSession && getActions(latestSession);

    // Before combat has started
    if (!actions) {
        const attackers: CombatParticipantProps[] = [];
        const [attackersMaxHealth, attackersCurrentHealth] = [0, 0];
        const defenders: CombatParticipantProps[] = [];
        const [defendersMaxHealth, defendersCurrentHealth] = [0, 0];
        return (
            <PreCombatState
                {...props}
                selectedSeeker={selectedSeeker}
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

    const convertedActions = convertCombatActions(actions);
    const combat = new Combat(); // Is a class because it was converted from solidity
    const orderedListIndexes = combat.getOrderedListIndexes(convertedActions);
    const combatState = combat.calcCombatState(convertedActions, orderedListIndexes, blockNumber);

    const attackers: CombatParticipantProps[] = combatState.attackerStates.map(entityStateToCombatParticipantProps);
    const [attackersMaxHealth, attackersCurrentHealth] = attackers.reduce(sumParticipants, [0, 0]);
    const defenders: CombatParticipantProps[] = combatState.defenderStates.map(entityStateToCombatParticipantProps);
    const [defendersMaxHealth, defendersCurrentHealth] = defenders.reduce(sumParticipants, [0, 0]);

    // During combat
    if (combatState.winState == CombatWinState.NONE) {
        return (
            <CombatState
                {...props}
                selectedSeeker={selectedSeeker}
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

    const finaliseCombat = () => {
        const action: CogAction = {
            name: 'FINALISE_COMBAT',
            args: [latestSession.id, actions, orderedListIndexes]
        };
        player?.dispatch(action);
    };

    // When combat has finished
    return (
        <PostCombatState
            {...props}
            selectedSeeker={selectedSeeker}
            selectedTiles={selectedTiles}
            attackers={attackers}
            attackersMaxHealth={attackersMaxHealth}
            attackersCurrentHealth={attackersCurrentHealth}
            defenders={defenders}
            defendersMaxHealth={defendersMaxHealth}
            defendersCurrentHealth={defendersCurrentHealth}
            winState={combatState.winState}
            session={latestSession}
            finaliseCombat={finaliseCombat}
        />
    );
};

const getIcon = (entityID: BytesLike) => {
    const id = hexlify(entityID);

    if (buildingRegex.test(id)) {
        return '/building-tower.png';
    }

    // todo check for player seeker

    return '/seeker-theirs.png';
};

const entityStateToCombatParticipantProps = ({ entityID, damage, stats, isDead, isPresent }: EntityState) => ({
    name: `Unit #${formatUnitKey(hexlify(entityID))}`,
    icon: getIcon(entityID),
    maxHealth: stats[ATOM_LIFE],
    currentHealth: Math.max(stats[ATOM_LIFE] - damage, 0),
    attack: stats[ATOM_ATTACK],
    defence: stats[ATOM_DEFENSE],
    isDead,
    isPresent
});

const sumParticipants = (
    [participantsMaxHealth, participantsCurrentHealth]: number[],
    { maxHealth, currentHealth }: CombatParticipantProps
) => {
    return [participantsMaxHealth + maxHealth, participantsCurrentHealth + currentHealth];
};

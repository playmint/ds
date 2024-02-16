/** @format */

import { ConnectedPlayer, WorldStateFragment } from '@app/../../core/src';
import { COMBAT_JOIN_WINDOW_BLOCKS, CombatWinState } from '@app/plugins/combat/combat';
import { CombatParticipant, CombatParticipantProps } from '@app/plugins/combat/combat-participant';
import { CombatSession, LIFE_MUL, getMaterialStats, getMobileUnitStats } from '@app/plugins/combat/helpers';
import { ProgressBar } from '@app/plugins/combat/progress-bar';
import { TickTimerProgressBar } from '@app/plugins/combat/tick-timer-progress-bar';
import { ComponentProps } from '@app/types/component-props';
import { WorldCombatSessionFragment } from '@downstream/core/src/gql/graphql';
import { Fragment, FunctionComponent } from 'react';
import styled from 'styled-components';
import { styles } from './combat-modal.styles';
import { ActionButton } from '@app/styles/button.styles';
import { formatNameOrId } from '@app/helpers';
import { BLOCK_TIME_SECS } from '@app/fixtures/block-time-secs';

export type CombatModalProps = ComponentProps & {
    world: WorldStateFragment;
    player: ConnectedPlayer;
    blockNumber: number;
    closeModal: () => void;
    session: WorldCombatSessionFragment;
    combatStartRemainingSecs: number;
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
        combatStartRemainingSecs,
    } = props;

    const timeRemaining = new Date(combatStartRemainingSecs * 1000).toISOString().slice(11, 19);

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
                    maxValue={COMBAT_JOIN_WINDOW_BLOCKS * BLOCK_TIME_SECS}
                    currentValue={combatStartRemainingSecs}
                    label={`combat starts in ${timeRemaining}`}
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
}> = ({ closeModal }) => {
    return <ActionButton onClick={closeModal}>Close Combat</ActionButton>;
};

const PostCombatState: FunctionComponent<PostCombatStateProps> = (props) => {
    const {
        closeModal,
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
                <PostCombatFooter closeModal={closeModal} isFinalised={!!session.isFinalised} />
            </div>
        </StyledCombatModal>
    );
};

enum CombatModalState {
    Combat,
    PostCombat,
}

// --------------------------------------------------------------------------------------- //

export const CombatModal: FunctionComponent<CombatModalProps> = (props: CombatModalProps) => {
    const { world, blockNumber, closeModal, session: latestSession } = props;

    // Find all units/buildings present on the two combat tiles
    const attackUnits = world.mobileUnits.filter((u) => u.nextLocation?.tile.id == latestSession.attackTile?.tile.id);
    const attackBuildings = world.buildings.filter((b) => b.location?.tile.id == latestSession.attackTile?.tile.id);
    const defenceUnits = world.mobileUnits.filter((u) => u.nextLocation?.tile.id == latestSession.defenceTile?.tile.id);
    const defenceBuildings = world.buildings.filter((b) => b.location?.tile.id == latestSession.defenceTile?.tile.id);

    const getParticipantProps = (
        units: typeof attackUnits,
        buildings: typeof attackBuildings
    ): CombatParticipantProps[] => {
        return units
            .map((u) => {
                const [maxHealth, defence, attack] = getMobileUnitStats(u, world.bags);
                return {
                    name: formatNameOrId(u, '#unit'),
                    maxHealth,
                    currentHealth: maxHealth,
                    attack,
                    defence,
                    isDead: false,
                    isPresent: true,
                } as CombatParticipantProps;
            })
            .concat(
                buildings.map((b) => {
                    const [maxHealth, defence, attack] = getMaterialStats(b.kind?.materials || []);
                    return {
                        name: b.kind?.name?.value,
                        maxHealth: maxHealth * LIFE_MUL,
                        currentHealth: maxHealth * LIFE_MUL,
                        attack,
                        defence,
                        isDead: false,
                        isPresent: true,
                    } as CombatParticipantProps;
                })
            );
    };

    const attackers = getParticipantProps(attackUnits, attackBuildings);
    const attackersMaxHealth = attackers.reduce((acc, participant) => acc + participant.maxHealth, 0);
    const defenders = getParticipantProps(defenceUnits, defenceBuildings);
    const defendersMaxHealth = defenders.reduce((acc, participant) => acc + participant.maxHealth, 0);

    // state transitions
    // const combatModalState = useMemo(() => {
    //     if (latestSession && latestSession.isFinalised) {
    //         return CombatModalState.PostCombat;
    //     } else if (latestSession && !latestSession.isFinalised) {
    //         if (combatState.winState === CombatWinState.NONE) {
    //             return CombatModalState.Combat;
    //         } else {
    //             return CombatModalState.PostCombat;
    //         }
    //     } else {
    //         return null;
    //     }
    // }, [combatState, latestSession]);

    const combatModalState = CombatModalState.Combat;

    // During combat
    if (combatModalState === CombatModalState.Combat) {
        return (
            <CombatState
                {...props}
                attackers={attackers}
                attackersMaxHealth={attackersMaxHealth}
                attackersCurrentHealth={attackersMaxHealth}
                defenders={defenders}
                defendersMaxHealth={defendersMaxHealth}
                defendersCurrentHealth={defendersMaxHealth}
                blockNumber={blockNumber || 0}
                blockTime={2}
                tickCount={0}
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
                attackersCurrentHealth={defendersMaxHealth}
                defenders={defenders}
                defendersMaxHealth={defendersMaxHealth}
                defendersCurrentHealth={defendersMaxHealth}
                winState={CombatWinState.DRAW}
                session={latestSession}
            />
        );
    }

    return null;
};

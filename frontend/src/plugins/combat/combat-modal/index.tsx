/** @format */

import { FunctionComponent } from 'react';
import styled from 'styled-components';
import { ComponentProps } from '@app/types/component-props';
import { styles } from './combat-modal.styles';
import { CombatParticipant, CombatParticipantProps } from '@app/plugins/combat/combat-participant';
import { ProgressBar } from '@app/plugins/combat/progress-bar';
import { TickTimerProgressBar } from '@app/plugins/combat/tick-timer-progress-bar';
import { SelectedTileFragment } from '@dawnseekers/core';
import { buildingRegex, convertCombatActions, getActions } from '@app/plugins/combat/helpers';
import { ATOM_ATTACK, ATOM_DEFENSE, ATOM_LIFE, Combat, CombatWinState, EntityState } from '@app/plugins/combat/combat';
import { formatSeekerKey } from '@app/helpers';
import { BytesLike, hexlify } from 'ethers';
import { useBlockTime } from '@app/contexts/block-time-provider';

export type CombatModalProps = ComponentProps & {
    selectedTiles: SelectedTileFragment[];
    closeModal: () => void;
};

const StyledCombatModal = styled('div')`
    ${styles}
`;

export const CombatModal: FunctionComponent<CombatModalProps> = (props: CombatModalProps) => {
    const { selectedTiles, closeModal, ...otherProps } = props;
    const latestSession =
        selectedTiles.length > 0 &&
        selectedTiles[0].sessions.length > 0 &&
        selectedTiles[0].sessions[selectedTiles[0].sessions.length - 1];

    const actions = latestSession && getActions(latestSession);
    const { blockNumber, blockTime } = useBlockTime();

    if (!actions) return null;

    const convertedActions = convertCombatActions(actions);
    const combat = new Combat(); // Is a class because it was converted from solidity
    const orderedListIndexes = combat.getOrderedListIndexes(convertedActions);
    const combatState = combat.calcCombatState(convertedActions, orderedListIndexes, blockNumber);

    const getIcon = (entityID: BytesLike) => {
        const id = hexlify(entityID);

        if (buildingRegex.test(id)) {
            return '/building-tower.png';
        }

        // todo check for player seeker

        return '/seeker-theirs.png';
    };

    const entityStateToCombatParticipantProps = ({ entityID, damage, stats, isDead, isPresent }: EntityState) => ({
        name: `Seeker #${formatSeekerKey(hexlify(entityID))}`,
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

    const attackers = combatState.attackerStates.map(entityStateToCombatParticipantProps);
    const [attackersMaxHealth, attackersCurrentHealth] = attackers.reduce(sumParticipants, [0, 0]);
    const defenders = combatState.defenderStates.map(entityStateToCombatParticipantProps);
    const [defendersMaxHealth, defendersCurrentHealth] = defenders.reduce(sumParticipants, [0, 0]);

    return (
        <StyledCombatModal {...otherProps}>
            <button onClick={closeModal} className="close-modal-button">
                <i className="bi bi-x" />
            </button>
            <div className="header">
                {(() => {
                    switch (combatState.winState) {
                        case CombatWinState.NONE:
                            return <img src="/combat-header.png" alt="" className="icon" />;
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
                    }
                })()}
                <div className="attackers">
                    <span className="heading">Attackers</span>
                    <ProgressBar maxValue={attackersMaxHealth} currentValue={attackersCurrentHealth} />
                </div>
                <div className="defenders">
                    <span className="heading">Defenders</span>
                    <ProgressBar maxValue={defendersMaxHealth} currentValue={defendersCurrentHealth} />
                </div>
            </div>
            <div className="body">
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
            </div>
            <div className="footer">
                {(() => {
                    switch (combatState.winState) {
                        case CombatWinState.NONE:
                            return (
                                <TickTimerProgressBar
                                    className="in-progress"
                                    blockTime={blockTime}
                                    blockNumber={blockNumber}
                                />
                            );
                        case CombatWinState.ATTACKERS:
                            return (
                                <button onClick={closeModal} className="action-button">
                                    Claim rewards
                                </button>
                            );
                        case CombatWinState.DEFENDERS:
                            return (
                                <button onClick={closeModal} className="action-button">
                                    Close combat
                                </button>
                            );
                        case CombatWinState.DRAW:
                            return (
                                <button onClick={closeModal} className="action-button">
                                    Close combat
                                </button>
                            );
                    }
                })()}
            </div>
        </StyledCombatModal>
    );
};

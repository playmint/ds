/** @format */

import { ATOM_LIFE, Combat, EntityState } from '@app/plugins/combat/combat';
import { convertCombatActions, getActions } from '@app/plugins/combat/helpers';
import { ProgressBar } from '@app/plugins/combat/progress-bar';
import { ComponentProps } from '@app/types/component-props';
import { ConnectedPlayer, SelectedMobileUnitFragment, SelectedTileFragment } from '@downstream/core';
import { FunctionComponent } from 'react';
import styled from 'styled-components';
import { styles } from './combat-summary.styles';

export interface CombatSummaryProps extends ComponentProps {
    selectedTiles: SelectedTileFragment[];
    player?: ConnectedPlayer;
    blockNumber: number;
    selectedMobileUnit?: SelectedMobileUnitFragment;
    onShowCombatModal?: (isNewSession: boolean) => void;
}

const StyledCombatSummary = styled('div')`
    ${styles}
`;

export const CombatSummary: FunctionComponent<CombatSummaryProps> = (props: CombatSummaryProps) => {
    const { selectedTiles, onShowCombatModal, blockNumber, ...otherProps } = props;
    console.log('summary at', blockNumber);

    if (selectedTiles.length === 0 || selectedTiles[0].sessions.length === 0) return null;

    const sessions = selectedTiles[0].sessions;
    const latestSession = sessions.sort((a, b) => {
        return a.attackTile && b.attackTile ? b.attackTile.startBlock - a.attackTile.startBlock : 0;
    })[0];

    const actions = latestSession && getActions(latestSession);

    if (!actions || !blockNumber) return null;

    const convertedActions = convertCombatActions(actions);
    const combat = new Combat(); // Is a class because it was converted from solidity
    const orderedListIndexes = combat.getOrderedListIndexes(convertedActions);
    const combatState = combat.calcCombatState(convertedActions, orderedListIndexes, blockNumber);
    console.log('summarystate', combatState);

    const sumStats = (
        [participantsMaxHealth, participantsCurrentHealth]: number[],
        { stats, damage, isPresent }: EntityState
    ) => {
        const maxHealth = isPresent ? stats[ATOM_LIFE] : 0;
        const currentHealth = isPresent ? Math.max(stats[ATOM_LIFE] - damage, 0) : 0;
        return [participantsMaxHealth + maxHealth, participantsCurrentHealth + currentHealth];
    };
    const [attackersMaxHealth, attackersCurrentHealth] = combatState.attackerStates.reduce(sumStats, [0, 0]);
    const [defendersMaxHealth, defendersCurrentHealth] = combatState.defenderStates.reduce(sumStats, [0, 0]);

    return (
        <StyledCombatSummary {...otherProps}>
            <div className="header">
                <img src="/combat-header.png" alt="" className="icon" />
                <h3 className="title">Tile in combat</h3>
            </div>
            {actions && (
                <div className="content">
                    <div className="attackers">
                        <span className="heading">Attackers</span>
                        <ProgressBar maxValue={attackersMaxHealth} currentValue={attackersCurrentHealth} />
                    </div>
                    <div className="defenders">
                        <span className="heading">Defenders</span>
                        <ProgressBar maxValue={defendersMaxHealth} currentValue={defendersCurrentHealth} />
                    </div>
                    <button onClick={() => onShowCombatModal && onShowCombatModal(false)} className="action-button">
                        View Combat
                    </button>
                </div>
            )}
        </StyledCombatSummary>
    );
};

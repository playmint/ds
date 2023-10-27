/** @format */

import {
    CogAction,
    ConnectedPlayer,
    WorldMobileUnitFragment,
    WorldStateFragment,
    WorldTileFragment,
} from '@app/../../core/src';
import { Dialog } from '@app/components/molecules/dialog';
import { ATOM_LIFE, Combat, CombatWinState, EntityState } from '@app/plugins/combat/combat';
import { convertCombatActions, getActions } from '@app/plugins/combat/helpers';
import { ProgressBar } from '@app/plugins/combat/progress-bar';
import { ComponentProps } from '@app/types/component-props';
import { getSessionsAtTile } from '@downstream/core/src/utils';
import { FunctionComponent, useCallback, useState } from 'react';
import styled from 'styled-components';
import { CombatModal } from '../combat-modal';
import { styles } from './combat-summary.styles';
import { ActionButton } from '@app/styles/button.styles';
import { StyledHeaderPanel } from '@app/styles/base-panel.styles';

export interface CombatSummaryProps extends ComponentProps {
    selectedTiles: WorldTileFragment[];
    player?: ConnectedPlayer;
    world?: WorldStateFragment;
    blockNumber: number;
    selectedMobileUnit?: WorldMobileUnitFragment;
}

const StyledCombatSummary = styled(StyledHeaderPanel)`
    ${styles}
`;

export const CombatSummary: FunctionComponent<CombatSummaryProps> = (props: CombatSummaryProps) => {
    const { selectedTiles, world, blockNumber, player } = props;
    const sessions = world?.sessions || [];
    const [modal, setModal] = useState<boolean>(false);

    const showModal = useCallback(() => {
        setModal(true);
    }, []);

    const closeModal = useCallback(() => {
        setModal(false);
    }, []);

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
        player.dispatchAndWait(action).catch((err) => console.error(err));
    };

    const selectedTileSessions = selectedTiles.length > 0 ? getSessionsAtTile(sessions, selectedTiles[0]) : [];
    if (selectedTiles.length === 0 || selectedTileSessions.length === 0) {
        return null;
    }

    const latestSession = selectedTileSessions.sort((a, b) => {
        return a.attackTile && b.attackTile ? b.attackTile.startBlock - a.attackTile.startBlock : 0;
    })[0];

    const actions = latestSession && getActions(latestSession);

    if (!actions || !blockNumber) return null;

    const convertedActions = convertCombatActions(actions);
    const combat = new Combat(); // Is a class because it was converted from solidity
    const orderedListIndexes = combat.getOrderedListIndexes(convertedActions);
    const combatState = combat.calcCombatState(convertedActions, orderedListIndexes, blockNumber);

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
        <StyledCombatSummary>
            {modal && player && world && blockNumber && (
                <Dialog onClose={closeModal} width="850px" height="" icon="/combat-header.png">
                    <CombatModal
                        player={player}
                        world={world}
                        closeModal={closeModal}
                        blockNumber={blockNumber}
                        session={latestSession}
                    />
                </Dialog>
            )}
            <div className="header">
                <h3 className="title">Tile in combat</h3>
                <img src="/combat-header.png" alt="" className="icon" />
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
                    <ActionButton onClick={showModal}>View Combat</ActionButton>
                    {combatState.winState !== CombatWinState.NONE && (
                        <ActionButton onClick={handleFinaliseCombat}>End Combat</ActionButton>
                    )}
                </div>
            )}
        </StyledCombatSummary>
    );
};

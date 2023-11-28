/** @format */

import { useGameState, useSelection } from '@app/hooks/use-game-state';
import { ComponentProps } from '@app/types/component-props';
import { FunctionComponent, useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { styles } from './action-bar.styles';
import { UnitActionButton } from '@app/styles/button.styles';
import { getSessionsAtTileID } from '@downstream/core/src/utils';
import { convertCombatActions, getActions } from '../combat/helpers';
import { Combat, CombatWinState } from '../combat/combat';

const CONSTRUCT_INTENT = 'construct';
const MOVE_INTENT = 'move';
const COMBAT_INTENT = 'combat';

export interface ActionBarProps extends ComponentProps {
    blockNumber: number;
}

const StyledActionBar = styled('div')`
    ${styles}
`;

export const ActionBar: FunctionComponent<ActionBarProps> = (props: ActionBarProps) => {
    const { blockNumber } = props;
    const { selectIntent, intent, mobileUnit, selectTiles, selectMapElement } = useSelection();
    const { world } = useGameState();
    const sessions = world?.sessions || [];
    // New state variable to control the visibility of buttons
    const [showActions, setShowActions] = useState(true);

    const handleSelectIntent = useCallback(
        (newIntent: string | undefined) => {
            if (newIntent != intent) {
                if (selectTiles) {
                    selectTiles([]);
                    if (selectMapElement) {
                        selectMapElement(undefined);
                    }
                }
                if (selectIntent) {
                    selectIntent(newIntent);
                }
            }
        },
        [selectTiles, selectIntent, intent, selectMapElement]
    );

    function GetCombatState() {
        if (mobileUnit && mobileUnit.nextLocation) {
            const selectedTileSessions = getSessionsAtTileID(sessions, mobileUnit.nextLocation?.tile.id);
            if (selectedTileSessions.length !== 0) {
                const latestSession = selectedTileSessions.sort((a, b) => {
                    return a.attackTile && b.attackTile ? b.attackTile.startBlock - a.attackTile.startBlock : 0;
                })[0];

                const actions = latestSession && getActions(latestSession);

                if (actions) {
                    const convertedActions = convertCombatActions(actions);
                    const combat = new Combat(); // Is a class because it was converted from solidity
                    const orderedListIndexes = combat.getOrderedListIndexes(convertedActions);
                    return combat.calcCombatState(convertedActions, orderedListIndexes, blockNumber);
                }
            }
        }
        return null;
    }
    const combatState = GetCombatState()?.winState;

    useEffect(() => {
        console.log('useEffect triggered: ', combatState);
        if (combatState && combatState === CombatWinState.DEFENDERS) {
            console.log('Defenders won, hiding actions');
            setShowActions(false);

            const timeout = setTimeout(() => {
                console.log('Timeout completed, showing actions');
                setShowActions(true);
            }, 10000);

            return () => {
                console.log('Clearing timeout');
                clearTimeout(timeout);
            };
        }
        return () => {};
    }, [combatState]);

    if (!mobileUnit || !showActions) {
        return null;
    }

    //if (!combatState || combatState.winState != CombatWinState.DEFENDERS) {
    return (
        <StyledActionBar>
            <div className="actions">
                <UnitActionButton
                    className={`${intent === MOVE_INTENT ? 'toggleOn' : ''}`}
                    onClick={() => handleSelectIntent(MOVE_INTENT)}
                >
                    Move
                </UnitActionButton>
                <UnitActionButton
                    className={`${intent === CONSTRUCT_INTENT ? 'toggleOn' : ''}`}
                    onClick={() => handleSelectIntent(CONSTRUCT_INTENT)}
                >
                    Build
                </UnitActionButton>
                <UnitActionButton
                    className={`${intent === COMBAT_INTENT ? 'toggleOn' : ''}`}
                    onClick={() => handleSelectIntent(COMBAT_INTENT)}
                >
                    Attack
                </UnitActionButton>
            </div>
        </StyledActionBar>
    );
    // } else {
    //     return null;
    // }
};

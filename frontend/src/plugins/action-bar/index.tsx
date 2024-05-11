/** @format */

import { useSelection } from '@app/hooks/use-game-state';
import { ComponentProps } from '@app/types/component-props';
import { FunctionComponent, useCallback } from 'react';
import styled from 'styled-components';
import { styles } from './action-bar.styles';
import { UnitActionButton } from '@app/styles/button.styles';

const CONSTRUCT_INTENT = 'construct';
const MOVE_INTENT = 'move';
const COMBAT_INTENT = 'combat';

export interface ActionBarProps extends ComponentProps {
    construct: boolean;
    move: boolean;
    combat: boolean;
}

const StyledActionBar = styled('div')`
    ${styles}
`;

export const ActionBar: FunctionComponent<ActionBarProps> = ({ construct, move, combat }: ActionBarProps) => {
    const { selectIntent, intent, mobileUnit, selectTiles, selectMapElement } = useSelection();

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

    if (!mobileUnit) {
        return null;
    }

    return (
        <StyledActionBar>
            <div className="actions">
                {move && (
                    <UnitActionButton
                        className={`${intent === MOVE_INTENT ? 'toggleOn' : ''}`}
                        onClick={() => handleSelectIntent(MOVE_INTENT)}
                    >
                        Move
                    </UnitActionButton>
                )}
                {construct && (
                    <UnitActionButton
                        className={`${intent === CONSTRUCT_INTENT ? 'toggleOn' : ''}`}
                        onClick={() => handleSelectIntent(CONSTRUCT_INTENT)}
                    >
                        Build
                    </UnitActionButton>
                )}
                {combat && (
                    <UnitActionButton
                        className={`${intent === COMBAT_INTENT ? 'toggleOn' : ''}`}
                        onClick={() => handleSelectIntent(COMBAT_INTENT)}
                    >
                        Attack
                    </UnitActionButton>
                )}
            </div>
        </StyledActionBar>
    );
};

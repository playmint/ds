/** @format */

import { useSelection } from '@app/hooks/use-game-state';
import { ComponentProps } from '@app/types/component-props';
import { FunctionComponent, useCallback } from 'react';
import styled from 'styled-components';
import { styles } from './action-bar.styles';

const CONSTRUCT_INTENT = 'construct';
const MOVE_INTENT = 'move';
const COMBAT_INTENT = 'combat';

export interface ActionBarProps extends ComponentProps {}

const StyledActionBar = styled('div')`
    ${styles}
`;

export const ActionBar: FunctionComponent<ActionBarProps> = ({}: ActionBarProps) => {
    const { selectIntent, intent, mobileUnit, selectTiles } = useSelection();

    const handleSelectIntent = useCallback(
        (newIntent: string | undefined) => {
            if (newIntent != intent) {
                if (selectTiles) {
                    selectTiles([]);
                }
                if (selectIntent) {
                    selectIntent(newIntent);
                }
            }
        },
        [selectTiles, selectIntent, intent]
    );

    if (!mobileUnit) {
        return null;
    }

    return (
        <StyledActionBar>
            <div className="actions">
                <button
                    className={`action-icon-button ${intent === MOVE_INTENT ? 'active' : ''}`}
                    onClick={() => handleSelectIntent(MOVE_INTENT)}
                >
                    Move
                </button>
                <button
                    className={`action-icon-button ${intent === CONSTRUCT_INTENT ? 'active' : ''}`}
                    onClick={() => handleSelectIntent(CONSTRUCT_INTENT)}
                >
                    Build
                </button>
                <button
                    className={`action-icon-button ${intent === COMBAT_INTENT ? 'active' : ''}`}
                    onClick={() => handleSelectIntent(COMBAT_INTENT)}
                >
                    Attack
                </button>
            </div>
        </StyledActionBar>
    );
};

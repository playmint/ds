/** @format */

import { FunctionComponent } from 'react';
import styled from 'styled-components';
import { ComponentProps } from '@app/types/component-props';
import { styles } from './action-menu.styles';
import { SelectedSeekerFragment } from '@dawnseekers/core';

const CONSTRUCT_INTENT = 'construct';
const USE_INTENT = 'use';
const MOVE_INTENT = 'move';
const SCOUT_INTENT = 'scout';

export interface ActionMenuProps extends ComponentProps {
    canScout: boolean;
    canConstruct: boolean;
    canMove: boolean;
    canUse: boolean;
    selectedSeeker?: SelectedSeekerFragment;
    intent?: string;
    selectedTileId?: string;
    onSelectIntent: (intent: string | undefined, tileId?: string) => void;
}

const StyledActionMenu = styled('div')`
    ${styles}
`;

export const ActionMenu: FunctionComponent<ActionMenuProps> = (props: ActionMenuProps) => {
    const {
        canScout,
        canConstruct,
        canMove,
        canUse,
        selectedSeeker,
        intent,
        selectedTileId = '',
        onSelectIntent,
        ...otherProps
    } = props;

    // for some intents we don't want to auto select the seeker's current tile
    const tileId = selectedSeeker?.nextLocation?.tile.id === selectedTileId ? '' : selectedTileId;

    return (
        <StyledActionMenu {...otherProps}>
            <h3>Actions</h3>
            <ul className="actions">
                <li>
                    <button
                        className={`action-icon-button ${!intent ? 'active' : ''}`}
                        disabled={!intent}
                        onClick={() => onSelectIntent(undefined)}
                    >
                        Select
                    </button>
                </li>
                <li>
                    <button
                        className={`action-icon-button ${intent === MOVE_INTENT ? 'active' : ''}`}
                        disabled={!canMove || intent === MOVE_INTENT}
                        onClick={() => onSelectIntent(MOVE_INTENT, tileId)}
                    >
                        Move
                    </button>
                </li>
                <li>
                    <button
                        className={`action-icon-button ${intent === SCOUT_INTENT ? 'active' : ''}`}
                        disabled={!canScout || intent === SCOUT_INTENT}
                        onClick={() => onSelectIntent(SCOUT_INTENT, tileId)}
                    >
                        Scout
                    </button>
                </li>
                <li>
                    <button
                        className={`action-icon-button ${intent === CONSTRUCT_INTENT ? 'active' : ''}`}
                        disabled={!canConstruct || intent === CONSTRUCT_INTENT}
                        onClick={() => onSelectIntent(CONSTRUCT_INTENT, tileId)}
                    >
                        Build
                    </button>
                </li>
                <li>
                    <button
                        className={`action-icon-button ${intent === USE_INTENT ? 'active' : ''}`}
                        disabled={!canUse || intent === USE_INTENT}
                        onClick={() => onSelectIntent(USE_INTENT, selectedTileId)}
                    >
                        Use
                    </button>
                </li>
            </ul>
        </StyledActionMenu>
    );
};

/** @format */

import { Dialog } from '@app/components/molecules/dialog';
import { trackEvent } from '@app/components/organisms/analytics';
import { Logs } from '@app/components/organisms/logs';
import { Onboarding } from '@app/components/organisms/onboarding';
import { PluginContent } from '@app/components/organisms/tile-action';
import { formatNameOrId } from '@app/helpers';
import { useUnityMap } from '@app/hooks/use-unity-map';
import { useWalletProvider } from '@app/hooks/use-wallet-provider';
import { ActionBar } from '@app/plugins/action-bar';
import { ActionContextPanel, TileInfoPanel } from '@app/plugins/action-context-panel';
import { CombatModal } from '@app/plugins/combat/combat-modal';
import { CombatRewards } from '@app/plugins/combat/combat-rewards';
import { CombatSummary } from '@app/plugins/combat/combat-summary';
import { MobileUnitInventory } from '@app/plugins/inventory/mobile-unit-inventory';
import { ComponentProps } from '@app/types/component-props';
import { PluginType, useBlock, useGameState, usePluginState, useWallet } from '@downstream/core';
import { Fragment, FunctionComponent, useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { pipe, subscribe } from 'wonka';
import { styles } from './shell.styles';

enum CombatModalState {
    INACTIVE,
    NEW_SESSION,
    EXISTING_SESSION,
}

export interface ShellProps extends ComponentProps {}

const StyledShell = styled('div')`
    ${styles}
`;

export const Shell: FunctionComponent<ShellProps> = () => {
    const { ready: mapReady, sendMessage } = useUnityMap();
    const { world, player, selectMobileUnit, selected } = useGameState();
    const { mobileUnit: selectedMobileUnit, tiles: selectedTiles } = selected || {};
    const blockNumber = useBlock();
    const [isGracePeriod, setIsGracePeriod] = useState<boolean>(true);
    const [combatModalState, setCombatModalState] = useState<CombatModalState>(CombatModalState.INACTIVE);
    const ui = usePluginState();
    const { connect } = useWalletProvider();
    const { wallet } = useWallet();

    // collect client dispatch analytics
    useEffect(() => {
        if (!player) {
            return;
        }
        const { unsubscribe } = pipe(
            player.dispatched,
            subscribe((event) => event.actions.map((action) => trackEvent('dispatch', { action: action.name })))
        );
        return unsubscribe;
    }, [player]);

    useEffect(() => {
        // arbitary time til until we show things like
        // the optional "jump to unit" button
        setTimeout(() => setIsGracePeriod(false), 10000);
    }, []);

    const selectAndFocusMobileUnit = useCallback(() => {
        if (!player) {
            return;
        }
        const mobileUnit = player.mobileUnits.find(() => true);
        if (!mobileUnit) {
            return;
        }
        if (!mapReady) {
            return;
        }
        if (!sendMessage) {
            return;
        }
        if (!selectMobileUnit) {
            return;
        }
        selectMobileUnit(mobileUnit.id);
        const tileId = mobileUnit.nextLocation?.tile.id;
        sendMessage('MapInteractionManager', 'FocusTile', tileId);
    }, [selectMobileUnit, player, sendMessage, mapReady]);

    const selectNextMobileUnit = useCallback(
        (n: number) => {
            if (!player) {
                return;
            }
            if (!selectMobileUnit) {
                return;
            }
            if (!selectedMobileUnit) {
                return;
            }
            if (player.mobileUnits.length === 0) {
                return;
            }
            const mobileUnitIndex = player.mobileUnits.map((s) => s.id).indexOf(selectedMobileUnit.id);
            const nextIndex =
                mobileUnitIndex + n > player.mobileUnits.length - 1
                    ? 0
                    : mobileUnitIndex + n < 0
                    ? player.mobileUnits.length - 1
                    : mobileUnitIndex + n;
            selectMobileUnit(player.mobileUnits[nextIndex].id);
        },
        [player, selectMobileUnit, selectedMobileUnit]
    );

    const nameEntity = useCallback(
        (entityId: string | undefined) => {
            if (!entityId) {
                return;
            }
            if (!player) {
                return;
            }
            const name = prompt('Enter a name:');
            if (!name || name.length < 3) {
                return;
            }
            if (name.length > 20) {
                alert('rejected: max 20 characters');
                return;
            }
            player
                .dispatch({ name: 'NAME_OWNED_ENTITY', args: [entityId, name] })
                .catch((err) => console.error('naming failed', err));
        },
        [player]
    );

    const showCombatModal = useCallback((isNewSession: boolean = false) => {
        setCombatModalState(isNewSession ? CombatModalState.NEW_SESSION : CombatModalState.EXISTING_SESSION);
    }, []);

    const closeCombatModal = useCallback(() => {
        setCombatModalState(CombatModalState.INACTIVE);
    }, []);

    const itemPluginStates = (ui || [])
        .filter((p) => p.config.type === PluginType.ITEM)
        .flatMap((p) => p.state.components.flatMap((c) => c.content));

    return (
        <StyledShell>
            {combatModalState !== CombatModalState.INACTIVE && player && world && blockNumber && (
                <Dialog onClose={closeCombatModal} width="850px" height="" icon="/combat-header.png">
                    <CombatModal
                        player={player}
                        world={world}
                        isNewSession={combatModalState === CombatModalState.NEW_SESSION}
                        closeModal={closeCombatModal}
                        blockNumber={blockNumber}
                    />
                </Dialog>
            )}
            <div className="nav-container">
                <button onClick={connect}>
                    <img src="/icons/player.png" alt="" />
                    <span className="text">
                        {!wallet ? 'connect' : !player ? 'connecting' : formatNameOrId(player, 'Player 0x..')}
                    </span>
                </button>
            </div>
            <div className="hud-container">
                <div className="top-left">
                    <Logs className="logs" />
                </div>
                <div className="bottom-left">
                    {!isGracePeriod && world && player && player.mobileUnits.length > 0 && !selectedMobileUnit && (
                        <div className="onboarding" style={{ width: '30rem', background: 'transparent' }}>
                            <button onClick={selectAndFocusMobileUnit}>Select Unit</button>
                        </div>
                    )}
                    {player && (
                        <Fragment>
                            {itemPluginStates.length > 0 && (
                                <div className="tile-actions action">
                                    <div className="controls">
                                        {itemPluginStates.map((content, idx) =>
                                            content ? <PluginContent key={idx} content={content} /> : undefined
                                        )}
                                    </div>
                                </div>
                            )}
                            <div className="mobile-unit-actions">
                                {(!player || (player && player.mobileUnits.length > 0 && selectedMobileUnit)) && (
                                    <div className="mobile-unit-selector">
                                        <img src="/mobile-unit-yours.png" className="shield" alt="" />
                                        <div className="controls">
                                            <button className="icon-button" onClick={() => selectNextMobileUnit(-1)}>
                                                <img src="/icons/prev.png" alt="Previous" />
                                            </button>
                                            <span
                                                className="label"
                                                onDoubleClick={() => nameEntity(selectedMobileUnit?.id)}
                                            >
                                                {formatNameOrId(selectedMobileUnit, 'Unit ')}
                                            </span>
                                            <button className="icon-button" onClick={() => selectNextMobileUnit(+1)}>
                                                <img src="/icons/next.png" alt="Next" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {selectedMobileUnit && (
                                    <MobileUnitInventory className="action" mobileUnit={selectedMobileUnit} />
                                )}
                            </div>
                        </Fragment>
                    )}
                </div>
                <div className="top-middle"></div>
                <div className="bottom-middle">
                    {player && player.mobileUnits.length > 0 && selectedMobileUnit && (
                        <div className="controls">
                            <ActionContextPanel onShowCombatModal={showCombatModal} />
                            <ActionBar />
                        </div>
                    )}
                </div>
                <div className="right">
                    {(!player || (player && player.mobileUnits.length === 0)) && mapReady && connect && (
                        <Onboarding player={player} onClickConnect={connect} />
                    )}
                    {player && player.mobileUnits.length > 0 && (
                        <div className="tile-actions">
                            <TileInfoPanel className="action" onShowCombatModal={showCombatModal} />
                        </div>
                    )}
                    {selectedTiles && selectedTiles.length > 0 && blockNumber && (
                        <Fragment>
                            {selectedTiles[0].sessions.filter((s) => !s.isFinalised).length > 0 && (
                                <CombatSummary
                                    className="action"
                                    selectedTiles={selectedTiles}
                                    onShowCombatModal={showCombatModal}
                                    player={player}
                                    selectedMobileUnit={selectedMobileUnit}
                                    blockNumber={blockNumber}
                                />
                            )}
                        </Fragment>
                    )}
                    {selectedTiles && selectedTiles.length > 0 && selectedTiles[0].sessions.length > 0 && (
                        <div className="tile-actions">
                            <CombatRewards
                                className="action"
                                selectedTiles={selectedTiles}
                                player={player}
                                selectedMobileUnit={selectedMobileUnit}
                            />
                        </div>
                    )}
                </div>
            </div>
        </StyledShell>
    );
};
export default Shell;

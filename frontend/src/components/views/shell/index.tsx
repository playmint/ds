import { trackEvent } from '@app/components/organisms/analytics';
import { Tile } from '@app/components/map/Tile';
import { Logs } from '@app/components/organisms/logs';
import { Onboarding } from '@app/components/organisms/onboarding';
import { ItemPluginPanel } from '@app/components/panels/item-plugin-panel';
import { MobileUnitPanel } from '@app/components/panels/mobile-unit-panel';
import { NavPanel } from '@app/components/panels/nav-panel';
import { useBlock, useGameState, usePlayer } from '@app/hooks/use-game-state';
import { useSession } from '@app/hooks/use-session';
import { useUnityMap } from '@app/hooks/use-unity-map';
import { useWalletProvider } from '@app/hooks/use-wallet-provider';
import { ActionBar } from '@app/plugins/action-bar';
import { ActionContextPanel, TileInfoPanel } from '@app/plugins/action-context-panel';
import { CombatRewards } from '@app/plugins/combat/combat-rewards';
import { CombatSummary } from '@app/plugins/combat/combat-summary';
import { ComponentProps } from '@app/types/component-props';
import { Fragment, FunctionComponent, useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { pipe, subscribe } from 'wonka';
import { styles } from './shell.styles';
import { TileHighlight } from '@app/components/map/TileHighlight';
import { getCoords } from '@app/../../core/src';
import { getTileHeight } from '@app/helpers/tile';

export interface ShellProps extends ComponentProps {}

const StyledShell = styled('div')`
    ${styles}
`;

export const Shell: FunctionComponent<ShellProps> = () => {
    const { ready: mapReady } = useUnityMap();
    const { world, selected, selectTiles } = useGameState();
    const { loadingSession } = useSession();
    const player = usePlayer();
    const { mobileUnit: selectedMobileUnit, tiles: selectedTiles } = selected || {};
    const blockNumber = useBlock();
    const { connect } = useWalletProvider();

    // collect client dispatch analytics
    // TODO: move to analytics provider
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

    const [hovered, setHovered] = useState<string | undefined>();
    const hoveredTile = hovered ? world?.tiles?.find((t) => t.id === hovered) : undefined;

    const enter = useCallback((id) => {
        setHovered(id);
    }, []);

    const exit = useCallback((id) => {
        setHovered((prev) => (prev == id ? undefined : prev));
    }, []);

    const click = useCallback(
        (id) => {
            if (!selectTiles) {
                return;
            }
            selectTiles([id]);
        },
        [selectTiles]
    );
    const tiles = world?.tiles;
    const tileComponents = useMemo(() => {
        console.time('tileloop');
        if (!tiles) {
            return [];
        }
        const ts = tiles.map((t) => {
            const coords = getCoords(t);
            return (
                <Tile
                    key={t.id}
                    id={t.id}
                    height={getTileHeight(t)}
                    color={t.building ? 'blue' : '#7288A6'} // blue is a fake building
                    onPointerEnter={enter}
                    onPointerExit={exit}
                    onPointerClick={click}
                    {...coords}
                />
            );
        });
        console.timeEnd('tileloop');
        return ts;
    }, [tiles, click, enter, exit]);

    return (
        <StyledShell>
            {mapReady && (
                <>
                    {tileComponents}
                    {hoveredTile &&
                        [hoveredTile].map((t) => {
                            const coords = getCoords(t);
                            return (
                                <TileHighlight
                                    key={`hov-${t.id}`}
                                    id={`hov-${t.id}`}
                                    height={getTileHeight(t)}
                                    color="white"
                                    style="gradient_blue"
                                    animation="none"
                                    {...coords}
                                />
                            );
                        })}
                    {selected &&
                        (selected.tiles || []).map((t) => {
                            const coords = getCoords(t);
                            return (
                                <TileHighlight
                                    key={`selected-${t.id}`}
                                    id={`selected-${t.id}`}
                                    height={getTileHeight(t)}
                                    color="white"
                                    style="gradient_outline"
                                    animation="none"
                                    {...coords}
                                />
                            );
                        })}
                    {world &&
                        world.tiles
                            .flatMap((t) => t.mobileUnits.map((u) => ({ t, u })))
                            .map(({ t, u }) => {
                                const coords = getCoords(t);
                                return (
                                    <TileHighlight // using white highlight as fake unit
                                        key={`unit-${u.id}`}
                                        id={`unit-${u.id}`}
                                        height={getTileHeight(t)}
                                        color="#eeeeee"
                                        style="flat"
                                        animation="none"
                                        {...coords}
                                    />
                                );
                            })}
                </>
            )}
            <div className="nav-container">
                <NavPanel />
            </div>
            <div className="hud-container">
                <div className="top-left">
                    <Logs className="logs" />
                </div>
                <div className="bottom-left">
                    <ItemPluginPanel />
                    <MobileUnitPanel />
                </div>
                <div className="top-middle"></div>
                <div className="bottom-middle">
                    {player && player.mobileUnits.length > 0 && selectedMobileUnit && (
                        <div className="controls">
                            <ActionContextPanel />
                            <ActionBar />
                        </div>
                    )}
                </div>
                <div className="right">
                    {(!player || (player && player.mobileUnits.length === 0)) &&
                        mapReady &&
                        connect &&
                        !loadingSession && <Onboarding player={player} onClickConnect={connect} />}
                    {player && player.mobileUnits.length > 0 && (
                        <div className="tile-actions">
                            <TileInfoPanel className="action" />
                        </div>
                    )}
                    {selectedTiles && selectedTiles.length > 0 && blockNumber && (
                        <Fragment>
                            {selectedTiles[0].sessions.filter((s) => !s.isFinalised).length > 0 && (
                                <CombatSummary
                                    className="action"
                                    selectedTiles={selectedTiles}
                                    world={world}
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

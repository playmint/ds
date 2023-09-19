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
import { GOO_SMALL_THRESH, getGooColor, getGooSize, getTileHeight } from '@app/helpers/tile';
import { FactoryBuilding } from '@app/components/map/FactoryBuilding';
import { BlockerBuilding } from '@app/components/map/BlockerBuilding';
import { BuildingCategory, getBuildingCategory } from '@app/helpers/building';
import { ExtractorBuilding } from '@app/components/map/ExtractorBuilding';
import { TileGoo } from '@app/components/map/TileGoo';
import { MobileUnit } from '@app/components/map/MobileUnit';

export interface ShellProps extends ComponentProps {}

const StyledShell = styled('div')`
    ${styles}
`;

export const Shell: FunctionComponent<ShellProps> = () => {
    const { ready: mapReady } = useUnityMap();
    const { world, selected, selectTiles, selectMobileUnit } = useGameState();
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

    // -- TILE

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
                    color="#7288A6"
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

    // -- GOO

    const tileGooComponents = useMemo(() => {
        console.time('tileGooloop');
        if (!tiles) {
            return [];
        }

        const gs = tiles
            .filter((t) => {
                t.atoms.sort((a, b) => b.weight - a.weight);
                return t.atoms[0].weight >= GOO_SMALL_THRESH;
            })
            .map((t) => {
                const coords = getCoords(t);

                return (
                    <TileGoo
                        key={`tileGoo-${t.id}`}
                        id={`tileGoo-${t.id}`}
                        height={getTileHeight(t) + 0.01}
                        color={getGooColor(t.atoms[0])}
                        size={getGooSize(t.atoms[0])}
                        {...coords}
                    />
                );
            });

        console.timeEnd('tileGooloop');
        return gs;
    }, [tiles]);

    // -- BUILDINGS

    const buildingComponents = useMemo(() => {
        console.time('buildingLoop');
        if (!tiles) {
            return [];
        }
        const bs = tiles.map((t) => {
            const coords = getCoords(t);
            //TODO: Need to properly implement buildings!!
            if (t.building) {
                if (t.building.kind == null) return;
                if (getBuildingCategory(t.building.kind) == BuildingCategory.EXTRACTOR) {
                    return (
                        <ExtractorBuilding
                            progress={0.5}
                            key={t.building.id}
                            id={t.building.id}
                            height={getTileHeight(t)}
                            rotation={0}
                            color={'#0665F5FF'} //TODO: Get actual color values
                            onPointerEnter={enter}
                            onPointerExit={exit}
                            onPointerClick={click}
                            {...coords}
                        />
                    );
                } else if (getBuildingCategory(t.building.kind) == BuildingCategory.BLOCKER) {
                    return (
                        <BlockerBuilding
                            key={t.building.id}
                            id={t.building.id}
                            height={getTileHeight(t)}
                            model={t.building.kind?.model?.value}
                            rotation={0}
                            onPointerEnter={enter}
                            onPointerExit={exit}
                            onPointerClick={click}
                            {...coords}
                        />
                    );
                } else {
                    return (
                        <FactoryBuilding
                            key={t.building.id}
                            id={t.building.id}
                            height={getTileHeight(t)}
                            model={t.building.kind?.model?.value}
                            rotation={0}
                            onPointerEnter={enter}
                            onPointerExit={exit}
                            onPointerClick={click}
                            {...coords}
                        />
                    );
                }
            }
        });
        console.timeEnd('buildingLoop');
        return bs;
    }, [tiles, click, enter, exit]);

    // -- MOBILE UNIT

    const [mobileUnitHovered, setMobileUnitHovered] = useState<string | undefined>();

    const mobileUnitClick = useCallback(
        (id) => {
            if (!player) {
                return;
            }
            if (!selectMobileUnit) {
                return;
            }

            // Only allow select state on player's mobile units
            const playerMobileUnit = player.mobileUnits.find((mu) => mu.id == id);
            if (!playerMobileUnit) {
                return;
            }
            selectMobileUnit(id);
            setMobileUnitHovered(undefined);
        },
        [player, selectMobileUnit, setMobileUnitHovered]
    );

    const mobileUnitEnter = useCallback(
        (id) => {
            if (!player) {
                return;
            }

            // No hover state over selected units
            if (selected && selected.mobileUnit?.id == id) {
                return;
            }

            // Only allow hover state on player's mobile units
            const playerMobileUnit = player.mobileUnits.find((mu) => mu.id == id);
            if (!playerMobileUnit) {
                return;
            }
            setMobileUnitHovered(id);
        },
        [player, selected]
    );

    const mobileUnitExit = useCallback((id) => {
        setMobileUnitHovered((prev) => (prev == id ? undefined : prev));
    }, []);

    const mobileUnitComponents = useMemo(() => {
        console.time('mobileUnitsLoop');
        if (!tiles) {
            return [];
        }

        const getMobileUnitSelectionState = (mobileUnit) => {
            if (mobileUnitHovered == mobileUnit.id) {
                return 'highlight';
            }

            if (selected && selected.mobileUnit?.id == mobileUnit.id) {
                return 'outline';
            }

            return 'none';
        };

        const mus = tiles
            .flatMap((t) => {
                let foundPlayer = false;
                return t.mobileUnits.map((u, i) => {
                    // Show either the last unit in the array or the player unit in the array.
                    const isPlayer = !!player?.mobileUnits?.find((playerUnit) => playerUnit.id == u.id);
                    if (isPlayer) {
                        foundPlayer = true;
                    }
                    const isLast = i == t.mobileUnits.length - 1;
                    const visible = isPlayer || (isLast && !foundPlayer);
                    return { t, u, visible };
                });
            })
            .map(({ t, u, visible }) => {
                const coords = getCoords(t);
                return (
                    <MobileUnit
                        key={u.id}
                        id={u.id}
                        height={getTileHeight(t)}
                        progress={1}
                        selected={getMobileUnitSelectionState(u)}
                        shared={!!t.building}
                        visible={visible}
                        onPointerClick={mobileUnitClick}
                        onPointerEnter={mobileUnitEnter}
                        onPointerExit={mobileUnitExit}
                        {...coords}
                    />
                );
            });

        // const musAlt = tiles.map((t) => )

        console.timeEnd('mobileUnitsLoop');
        return mus;
    }, [mobileUnitClick, mobileUnitEnter, mobileUnitExit, mobileUnitHovered, player, selected, tiles]);

    return (
        <StyledShell>
            {mapReady && (
                <>
                    {tileComponents}
                    {tileGooComponents}
                    {buildingComponents}
                    {mobileUnitComponents}
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

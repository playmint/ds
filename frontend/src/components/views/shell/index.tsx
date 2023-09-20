import { getCoords } from '@app/../../core/src';
import { BlockerBuilding } from '@app/components/map/BlockerBuilding';
import { ExtractorBuilding } from '@app/components/map/ExtractorBuilding';
import { FactoryBuilding } from '@app/components/map/FactoryBuilding';
import { Icon } from '@app/components/map/Icon';
import { Label } from '@app/components/map/Label';
import { MobileUnit } from '@app/components/map/MobileUnit';
import { Tile } from '@app/components/map/Tile';
import { TileGoo } from '@app/components/map/TileGoo';
import { TileHighlight } from '@app/components/map/TileHighlight';
import { trackEvent } from '@app/components/organisms/analytics';
import { Logs } from '@app/components/organisms/logs';
import { Onboarding } from '@app/components/organisms/onboarding';
import { ItemPluginPanel } from '@app/components/panels/item-plugin-panel';
import { MobileUnitPanel } from '@app/components/panels/mobile-unit-panel';
import { NavPanel } from '@app/components/panels/nav-panel';
import { BuildingCategory, getBuildingCategory } from '@app/helpers/building';
import { GOO_SMALL_THRESH, getGooColor, getGooSize, getTileHeight, getUnscaledNoise } from '@app/helpers/tile';
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

export interface ShellProps extends ComponentProps {}

const StyledShell = styled('div')`
    ${styles}
`;

export const Shell: FunctionComponent<ShellProps> = () => {
    const { ready: mapReady } = useUnityMap();
    const { world, selected, selectTiles, selectMobileUnit, selectMapElement } = useGameState();
    const { loadingSession } = useSession();
    const player = usePlayer();
    const {
        mobileUnit: selectedMobileUnit,
        tiles: selectedTiles,
        mapElement: selectedMapElementId,
        intent: selectedIntent,
    } = selected || {};
    const blockNumber = useBlock();
    const { connect } = useWalletProvider();

    const lerp = (x, y, a) => x * (1 - a) + y * a;

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

    const tiles = world?.tiles;

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

            // TODO: find another way to do this as it causes jank
            // const t = tiles?.find((t) => t.id == id);
            // selectMapElement(t?.building?.id);
            // Deselect unit if we aren't in move intent and tile isn't ajacent
            // if (selectedIntent != 'move' && t && selectedMobileUnit?.nextLocation) {
            //     const dist = getTileDistance(t, selectedMobileUnit.nextLocation.tile);
            //     if (dist > 1) {
            //         selectMobileUnit(undefined);
            //     }
            //     return;
            // }
        },
        [selectTiles]
    );

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

    const [hoveredBuildingId, setHoveredBuildingId] = useState<string | undefined>();

    const buildingClick = useCallback(
        (id) => {
            if (!selectMapElement) {
                return;
            }

            selectMapElement(id);
            // setHoveredBuildingId(undefined);

            // select tile that building is on
            // const t = tiles.find((t) => t.building?.id == id);
            // if (t) {
            //     selectTiles([t.id]);
            // }

            // Deselect unit if we aren't in move intent and tile isn't ajacent
            // if (selectedIntent != 'move' && t && selectedMobileUnit?.nextLocation) {
            //     const dist = getTileDistance(t, selectedMobileUnit.nextLocation.tile);
            //     if (dist > 1) {
            //         selectMobileUnit(undefined);
            //     }
            //     return;
            // }
        },
        [selectMapElement]
    );

    const buildingEnter = useCallback(
        (id) => {
            // No hover state over selected buildings
            if (selectedMapElementId == id) {
                return;
            }

            setHoveredBuildingId(id);
        },
        [selectedMapElementId]
    );

    const buildingExit = useCallback((id) => {
        setHoveredBuildingId((prev) => (prev == id ? undefined : prev));
    }, []);

    const buildingComponents = useMemo(() => {
        if (!tiles) {
            return [];
        }
        const getBuildingSelectionState = (building) => {
            if (hoveredBuildingId == building.id) {
                return 'highlight';
            }

            if (selectedMapElementId == building.id) {
                return 'outline';
            }

            return 'none';
        };

        console.time('buildingLoop');

        const bs = tiles
            .filter((t) => !!t.building)
            .map((t) => {
                const coords = getCoords(t);
                //TODO: Need to properly implement buildings!!
                if (!t.building || !t.building.kind) {
                    return null;
                }
                if (getBuildingCategory(t.building.kind) == BuildingCategory.EXTRACTOR) {
                    return (
                        <ExtractorBuilding
                            progress={0.5}
                            key={t.building.id}
                            id={t.building.id}
                            height={getTileHeight(t)}
                            rotation={lerp(-20, 20, 0.5 - getUnscaledNoise(t))}
                            color={'#0665F5FF'} //TODO: Get actual color values
                            selected={getBuildingSelectionState(t.building)}
                            onPointerEnter={buildingEnter}
                            onPointerExit={buildingExit}
                            onPointerClick={buildingClick}
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
                            rotation={lerp(-20, 20, 0.5 - getUnscaledNoise(t))}
                            selected={getBuildingSelectionState(t.building)}
                            onPointerEnter={buildingEnter}
                            onPointerExit={buildingExit}
                            onPointerClick={buildingClick}
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
                            rotation={lerp(-20, 20, 0.5 - getUnscaledNoise(t))}
                            selected={getBuildingSelectionState(t.building)}
                            onPointerEnter={buildingEnter}
                            onPointerExit={buildingExit}
                            onPointerClick={buildingClick}
                            {...coords}
                        />
                    );
                }
            });
        console.timeEnd('buildingLoop');
        return bs;
    }, [tiles, hoveredBuildingId, selectedMapElementId, buildingEnter, buildingExit, buildingClick]);

    // -- MOBILE UNIT

    const [hoveredMobileUnitId, setHoveredMobileUnitId] = useState<string | undefined>();

    const mobileUnitClick = useCallback(
        (id) => {
            // if (!player) {
            //     return;
            // }
            if (!selectMobileUnit || !selectTiles || !selectMapElement) {
                return;
            }

            // Only allow select state on player's mobile units
            // const playerMobileUnit = player.mobileUnits.find((mu) => mu.id == id);
            // if (!playerMobileUnit) {
            //     return;
            // }
            selectMobileUnit(id);

            setHoveredMobileUnitId(undefined);
            selectTiles(undefined);
            selectMapElement(undefined);

            // const unitTile = playerMobileUnit.nextLocation?.tile?.id;
            // if (!unitTile || !selectTiles) {
            //     return;
            // }
            // selectTiles([unitTile]);
        },
        [selectMapElement, selectMobileUnit, selectTiles]
    );

    const mobileUnitEnter = useCallback(
        (id) => {
            if (!player) {
                return;
            }

            // No hover state over selected units
            if (selectedMobileUnit?.id == id) {
                return;
            }

            // Only allow hover state on player's mobile units
            const playerMobileUnit = player.mobileUnits.find((mu) => mu.id == id);
            if (!playerMobileUnit) {
                return;
            }
            setHoveredMobileUnitId(id);
        },
        [player, selectedMobileUnit]
    );

    const mobileUnitExit = useCallback((id) => {
        setHoveredMobileUnitId((prev) => (prev == id ? undefined : prev));
    }, []);

    const mobileUnitComponents = useMemo(() => {
        console.time('mobileUnitsLoop');
        if (!tiles) {
            return [];
        }

        const getMobileUnitSelectionState = (mobileUnit) => {
            if (hoveredMobileUnitId == mobileUnit.id) {
                return 'highlight';
            }

            if (selectedMobileUnit?.id == mobileUnit.id) {
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
                    return { t, u, visible, isPlayer };
                });
            })
            .map(({ t, u, visible, isPlayer }) => {
                const coords = getCoords(t);
                if (t.mobileUnits.length > 1) {
                    return (
                        <>
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
                            {isPlayer && (
                                <Label
                                    text={t.mobileUnits.length.toString()}
                                    key={`${u.id}-icon`}
                                    id={`${u.id}-icon`}
                                    height={getTileHeight(t) + 0.7}
                                    {...coords}
                                />
                            )}
                        </>
                    );
                }

                return (
                    <>
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
                        {isPlayer && (
                            <Icon
                                backgroundColor={'#000000FF'}
                                foregroundColor={'#FFFFFFFF'}
                                image={'https://assets.downstream.game/icons/31-122.svg'}
                                key={`${u.id}-icon`}
                                id={`${u.id}-icon`}
                                height={getTileHeight(t) + 0.7}
                                {...coords}
                            />
                        )}
                    </>
                );
            });

        console.timeEnd('mobileUnitsLoop');
        return mus;
    }, [mobileUnitClick, mobileUnitEnter, mobileUnitExit, hoveredMobileUnitId, player, selectedMobileUnit, tiles]);

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
                    {(selected?.tiles || []).map((t) => {
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

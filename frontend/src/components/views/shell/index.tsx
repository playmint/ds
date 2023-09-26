import { BagFragment, BuildingKindFragment, WorldTileFragment, getCoords } from '@app/../../core/src';
import { Bag } from '@app/components/map/Bag';
import { BlockerBuilding } from '@app/components/map/BlockerBuilding';
import { ExtractorBuilding } from '@app/components/map/ExtractorBuilding';
import { FactoryBuilding } from '@app/components/map/FactoryBuilding';
import { GroundPlane } from '@app/components/map/GroundPlane';
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
import { TileInfoPanel } from '@app/components/panels/tile-info-panel';
import { BuildingCategory, getBuildingCategory } from '@app/helpers/building';
import {
    GOO_BLUE,
    GOO_GREEN,
    GOO_RED,
    GOO_SMALL_THRESH,
    getGooColor,
    getGooSize,
    getTileDistance,
    getTileHeight,
    getUnscaledNoise,
} from '@app/helpers/tile';
import { useBlock, useGameState, usePlayer } from '@app/hooks/use-game-state';
import { useSession } from '@app/hooks/use-session';
import { useUnityMap } from '@app/hooks/use-unity-map';
import { useWalletProvider } from '@app/hooks/use-wallet-provider';
import { ActionBar } from '@app/plugins/action-bar';
import { ActionContextPanel } from '@app/plugins/action-context-panel';
import { CombatSummary } from '@app/plugins/combat/combat-summary';
import { Bag as BagComp } from '@app/plugins/inventory/bag';
import { ComponentProps } from '@app/types/component-props';
import { FunctionComponent, useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { pipe, subscribe } from 'wonka';
import { styles } from './shell.styles';

export interface ShellProps extends ComponentProps {}

const Panel = styled.div`
    background: #143063;
    color: #fff;
    padding: 2rem 2rem;
    margin-bottom: 1.2rem;
    width: 30rem;
    position: relative;
`;

const StyledShell = styled('div')`
    ${styles}
`;

export type SelectedBag = {
    equipIndex: number;
    bag: BagFragment;
    ownerId: string;
    parentTile: WorldTileFragment;
    isCombatReward?: boolean;
};

export const Shell: FunctionComponent<ShellProps> = () => {
    const { ready: mapReady } = useUnityMap();
    const { world, selected, selectTiles, selectMobileUnit, selectMapElement } = useGameState();
    const { loadingSession } = useSession();
    const player = usePlayer();
    const { mobileUnit: selectedMobileUnit, tiles: selectedTiles, mapElement: selectedMapElement } = selected || {};
    const blockNumber = useBlock();
    const { connect } = useWalletProvider();
    const [selectedBags, setSelectedBags] = useState<SelectedBag[]>();
    const tiles = world?.tiles;
    const selectedTileBags = selectedBags?.filter((sb) => !sb.isCombatReward);
    const selectedRewardBags = selectedBags?.filter((sb) => sb.isCombatReward);

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

    const mapElementClick = useCallback(
        (id?: string, type?: string) => {
            if (!selectMapElement) {
                return;
            }
            if (id && type) {
                selectMapElement({ id, type });
            } else {
                // This is how we deselect the selected map element if we click the ground plane
                selectMapElement(undefined);
            }
        },
        [selectMapElement]
    );

    const getMapElementSelectionState = useCallback(
        (mapElementId) => {
            if (selectedMapElement?.id == mapElementId) {
                return 'outline';
            }
            return 'none';
        },
        [selectedMapElement]
    );

    // Handle map element selection update. Purposely not put in the click handler as updates to `tiles` invalidate the memo
    useEffect(() => {
        if (!selectedMapElement) {
            setSelectedBags(undefined);
            return;
        }
        if (!tiles) {
            return;
        }

        if (!selectTiles) {
            return;
        }

        selectTiles(undefined);
        setSelectedBags(undefined);

        switch (selectedMapElement.type) {
            case 'FactoryBuildingData':
            case 'BlockerBuildingData':
            case 'ExtractorBuildingData':
                {
                    const t = tiles.find((t) => t.building?.id == selectedMapElement.id);
                    if (t) {
                        selectTiles([t.id]);
                    }
                }
                break;

            case 'BagData':
                const tileId = selectedMapElement.id.replace('bag/', '');
                const t = tiles.find((t) => t.id == tileId);
                if (!t) {
                    setSelectedBags(undefined);
                    return;
                }

                // Tile bags
                const selectedBags: SelectedBag[] = t.bags.map((equipSlot, equipIndex): SelectedBag => {
                    return { equipIndex, bag: equipSlot.bag, ownerId: t.id, parentTile: t };
                });

                // Combat rewards
                if (selectedMobileUnit) {
                    // const cs = getLatestCombatSession(t);
                    const selectedRewardBags = t.sessions.flatMap((cs) => {
                        return cs.bags
                            .filter((equipSlot) => {
                                if (!cs.attackTile || cs.attackTile.tile.id !== t.id) {
                                    return false;
                                }
                                // reward containing bags have an ID that is made up of 16bits of sessionID and 48bits of MobileUnitID
                                // bagIDs are 64bits
                                const mobileUnitIdMask = BigInt('0xFFFFFFFFFFFF'); // 48bit mask (6 bytes)
                                const bagMobileUnitID = (BigInt(equipSlot.bag.id) >> BigInt(16)) & mobileUnitIdMask;
                                const truncatedMobileUnitID = BigInt(selectedMobileUnit.id) & mobileUnitIdMask;
                                return bagMobileUnitID === truncatedMobileUnitID;
                            })
                            ?.map((equipSlot, equipIndex): SelectedBag => {
                                return {
                                    equipIndex,
                                    bag: equipSlot.bag,
                                    ownerId: cs.id, // Very confusing because I expected the `ownerId` to be the unit's ID
                                    parentTile: t,
                                    isCombatReward: true,
                                };
                            });
                    });

                    if (selectedRewardBags) {
                        selectedBags.push(...selectedRewardBags);
                    }
                }

                setSelectedBags(selectedBags);
                break;
        }
    }, [selectTiles, selectedMapElement, selectedMobileUnit, tiles]);

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
            if (!selectMapElement) {
                return;
            }
            selectTiles([id]);
            selectMapElement(undefined);
        },
        [selectMapElement, selectTiles]
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
    }, [tiles, enter, exit, click]);

    const bagComponents = useMemo(() => {
        console.time('bagloop');
        if (!tiles) {
            return [];
        }
        const ts = tiles.map((t) => {
            const coords = getCoords(t);
            const rewardBags =
                (selectedMobileUnit &&
                    t.sessions.flatMap((cs) => {
                        return cs.bags.filter((equipSlot) => {
                            if (!cs.attackTile || cs.attackTile.tile.id !== t.id) {
                                return false;
                            }
                            // reward containing bags have an ID that is made up of 16bits of sessionID and 48bits of MobileUnitID
                            // bagIDs are 64bits
                            const mobileUnitIdMask = BigInt('0xFFFFFFFFFFFF'); // 48bit mask (6 bytes)
                            const bagMobileUnitID = (BigInt(equipSlot.bag.id) >> BigInt(16)) & mobileUnitIdMask;
                            const truncatedMobileUnitID = BigInt(selectedMobileUnit.id) & mobileUnitIdMask;
                            return bagMobileUnitID === truncatedMobileUnitID;
                        });
                    })) ||
                [];

            return t.bagCount > 0 || rewardBags.length > 0 ? (
                <Bag
                    id={`bag/${t.id}`}
                    key={`bag/${t.id}`}
                    height={getTileHeight(t)}
                    corner={0}
                    selected={getMapElementSelectionState(`bag/${t.id}`)}
                    onPointerClick={mapElementClick}
                    {...coords}
                />
            ) : null;
        });
        console.timeEnd('bagloop');
        return ts;
    }, [tiles, selectedMobileUnit, getMapElementSelectionState, mapElementClick]);

    const activeCombatHighlights = useMemo(() => {
        if (!tiles) {
            return [];
        }
        return tiles
            .filter((t) => t.sessions.some((s) => !s.isFinalised))
            .map((t) => (
                <TileHighlight
                    key={`session-${t.id}`}
                    id={`session-${t.id}`}
                    height={getTileHeight(t)}
                    color="red"
                    style="gradient_outline"
                    animation="none"
                    {...getCoords(t)}
                />
            ));
    }, [tiles]);

    // -- GOO

    const tileGooComponents = useMemo(() => {
        console.time('tileGooloop');
        if (!tiles) {
            return [];
        }

        const gs = tiles
            .filter((t) => {
                t.atoms.sort((a, b) => b.weight - a.weight);
                return t.atoms.length > 0 && t.atoms[0].weight >= GOO_SMALL_THRESH;
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

    function getColorFromGoo(kind) {
        const outputName = kind?.outputs?.find((e) => ['Green Goo', 'Blue Goo', 'Red Goo'].includes(e.item.name?.value))
            ?.item.name?.value;
        switch (outputName) {
            case 'Green Goo':
                return '#63B204FF';
            case 'Red Goo':
                return '#CA002BFF';
            case 'Blue Goo':
                return '#0665F5FF';
            default:
                return '#FFFFFFFF';
        }
    }

    const getGooIndexFromBuildingOutput = (buildingKind?: BuildingKindFragment) => {
        if (buildingKind?.outputs && buildingKind.outputs.length > 0) {
            const outputName = buildingKind.outputs[0].item.name?.value;

            switch (outputName) {
                case 'Green Goo':
                    return GOO_GREEN;
                case 'Red Goo':
                    return GOO_RED;
                case 'Blue Goo':
                    return GOO_BLUE;
            }
        }

        return -1;
    };

    const buildingComponents = useMemo(() => {
        if (!tiles) {
            return [];
        }

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
                            key={t.building.id}
                            id={t.building.id}
                            atoms={(t.atoms || []).sort((a, b) => a.key - b.key).map((elm) => elm.weight)}
                            lastExtraction={t.building.timestamp?.blockNum || 0}
                            gooReservoir={t.building.gooReservoir}
                            gooIndex={getGooIndexFromBuildingOutput(t.building?.kind)}
                            height={getTileHeight(t)}
                            rotation={lerp(-20, 20, 0.5 - getUnscaledNoise(t))}
                            color={getColorFromGoo(t.building.kind)}
                            selected={getMapElementSelectionState(t.building.id)}
                            onPointerClick={mapElementClick}
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
                            selected={getMapElementSelectionState(t.building.id)}
                            onPointerClick={mapElementClick}
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
                            selected={getMapElementSelectionState(t.building.id)}
                            onPointerClick={mapElementClick}
                            {...coords}
                        />
                    );
                }
            });
        console.timeEnd('buildingLoop');
        return bs;
    }, [tiles, getMapElementSelectionState, mapElementClick]);

    // -- MOBILE UNIT

    const [hoveredMobileUnitId, setHoveredMobileUnitId] = useState<string | undefined>();

    const mobileUnitClick = useCallback(
        (id) => {
            if (!selectMobileUnit || !selectTiles || !selectMapElement) {
                return;
            }

            selectMobileUnit(id);

            setHoveredMobileUnitId(undefined);
            selectTiles(undefined);
            selectMapElement(undefined);
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

        console.timeEnd('mobileUnitsLoop');
        return mus;
    }, [mobileUnitClick, mobileUnitEnter, mobileUnitExit, hoveredMobileUnitId, player, selectedMobileUnit, tiles]);

    const playerId = player?.id;
    const unitIcons = useMemo(
        () =>
            tiles?.flatMap((t) =>
                t.mobileUnits.map((u) => {
                    return u.owner?.id === playerId ? (
                        <Icon
                            backgroundColor={'#000000FF'}
                            foregroundColor={'#FFFFFFFF'}
                            image={'https://assets.downstream.game/icons/31-122.svg'}
                            key={u.id}
                            id={u.id}
                            height={getTileHeight(t) + 0.7}
                            {...getCoords(t)}
                        />
                    ) : null;
                })
            ),
        [tiles, playerId]
    );

    const deselectAll = useCallback(() => {
        mapElementClick();
        mobileUnitClick(null);
    }, [mobileUnitClick, mapElementClick]);

    const noop = useCallback(() => {}, []);

    return (
        <StyledShell>
            {mapReady && (
                <>
                    <GroundPlane
                        height={-0.1}
                        onPointerClick={deselectAll}
                        onPointerEnter={noop}
                        onPointerExit={noop}
                    />
                    {unitIcons}
                    {tileComponents}
                    {bagComponents}
                    {tileGooComponents}
                    {buildingComponents}
                    {mobileUnitComponents}
                    {activeCombatHighlights}
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
                    <ActionContextPanel />
                    <ActionBar />
                </div>
                <div className="right">
                    {(!player || (player && player.mobileUnits.length === 0)) &&
                        mapReady &&
                        connect &&
                        !loadingSession && <Onboarding player={player} onClickConnect={connect} />}
                    {player && player.mobileUnits.length > 0 && <TileInfoPanel />}
                    {selectedTiles &&
                        selectedTiles.length > 0 &&
                        blockNumber &&
                        selectedTiles[0].sessions.filter((s) => !s.isFinalised).length > 0 && (
                            <Panel>
                                <CombatSummary
                                    className="action"
                                    selectedTiles={selectedTiles}
                                    world={world}
                                    player={player}
                                    selectedMobileUnit={selectedMobileUnit}
                                    blockNumber={blockNumber}
                                />
                            </Panel>
                        )}
                    {selectedTileBags && selectedTileBags.length > 0 && (
                        <Panel>
                            {selectedTileBags.map((selectedBag) => {
                                return (
                                    <BagComp
                                        key={selectedBag.equipIndex}
                                        bag={selectedBag.bag}
                                        equipIndex={selectedBag.equipIndex}
                                        ownerId={selectedBag.ownerId}
                                        isInteractable={
                                            !!(
                                                selectedMobileUnit &&
                                                selectedMobileUnit.nextLocation &&
                                                getTileDistance(
                                                    selectedMobileUnit.nextLocation.tile,
                                                    selectedBag.parentTile
                                                ) < 2
                                            )
                                        }
                                        showIcon={true}
                                    />
                                );
                            })}
                        </Panel>
                    )}
                    {selectedRewardBags && selectedRewardBags.length > 0 && (
                        <Panel>
                            <h3>Combat rewards</h3>
                            {selectedRewardBags.map((selectedBag) => {
                                return (
                                    <BagComp
                                        key={selectedBag.equipIndex}
                                        bag={selectedBag.bag}
                                        equipIndex={selectedBag.equipIndex}
                                        ownerId={selectedBag.ownerId}
                                        isInteractable={
                                            !!(
                                                selectedMobileUnit &&
                                                selectedMobileUnit.nextLocation &&
                                                getTileDistance(
                                                    selectedMobileUnit.nextLocation.tile,
                                                    selectedBag.parentTile
                                                ) < 2
                                            )
                                        }
                                        showIcon={true}
                                    />
                                );
                            })}
                        </Panel>
                    )}
                </div>
            </div>
        </StyledShell>
    );
};
export default Shell;

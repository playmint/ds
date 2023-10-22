import { BagFragment, WorldTileFragment } from '@app/../../core/src';
import { Bags } from '@app/components/map/Bag';
import { Buildings } from '@app/components/map/Buildings';
import { CombatSessions } from '@app/components/map/CombatSession';
import { GroundPlane } from '@app/components/map/GroundPlane';
import { MobileUnits } from '@app/components/map/MobileUnit';
import { Tiles } from '@app/components/map/Tile';
import { TileGoos } from '@app/components/map/TileGoo';
import { trackEvent } from '@app/components/organisms/analytics';
import { Onboarding } from '@app/components/organisms/onboarding';
import { ItemPluginPanel } from '@app/components/panels/item-plugin-panel';
import { MobileUnitPanel } from '@app/components/panels/mobile-unit-panel';
import { NavPanel } from '@app/components/panels/nav-panel';
import { TileInfoPanel } from '@app/components/panels/tile-info-panel';
import { getTileDistance } from '@app/helpers/tile';
import { useBlock, useBuildingKinds, useGameState, usePlayer, usePluginState } from '@app/hooks/use-game-state';
import { useSession } from '@app/hooks/use-session';
import { useUnityMap } from '@app/hooks/use-unity-map';
import { useWalletProvider } from '@app/hooks/use-wallet-provider';
import { ActionBar } from '@app/plugins/action-bar';
import { ActionContextPanel } from '@app/plugins/action-context-panel';
import { CombatSummary } from '@app/plugins/combat/combat-summary';
import { Bag as BagInventory } from '@app/plugins/inventory/bag';
import { ComponentProps } from '@app/types/component-props';
import { FunctionComponent, useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { pipe, subscribe } from 'wonka';
import { styles } from './shell.styles';
import { QuestPanel } from '@app/components/panels/quest-panel';
import { getBagsAtEquipee, getBuildingAtTile, getSessionsAtTile } from '@downstream/core/src/utils';

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
    const { world, selected, tiles, selectTiles, selectMobileUnit, selectMapElement } = useGameState();
    const { loadingSession } = useSession();
    const player = usePlayer();
    const playerUnits = world?.mobileUnits.filter((mu) => mu.owner && player && mu.owner.id === player.id) || [];
    const { mobileUnit: selectedMobileUnit, tiles: selectedTiles, mapElement: selectedMapElement } = selected || {};
    const blockNumber = useBlock();
    const { connect } = useWalletProvider();
    const [selectedBags, setSelectedBags] = useState<SelectedBag[]>();
    const selectedTileBags = selectedBags?.filter((sb) => !sb.isCombatReward);
    const selectedRewardBags = selectedBags?.filter((sb) => sb.isCombatReward);
    const kinds = useBuildingKinds();
    const ui = usePluginState();

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
                    const t = tiles.find(
                        (t) => getBuildingAtTile(world?.buildings || [], t)?.id == selectedMapElement.id
                    );
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
                const selectedBags: SelectedBag[] = getBagsAtEquipee(world?.bags || [], t).map(
                    (bag, equipIndex): SelectedBag => {
                        return { equipIndex, bag, ownerId: t.id, parentTile: t };
                    }
                );

                // Combat rewards
                if (selectedMobileUnit) {
                    // const cs = getLatestCombatSession(t);
                    const selectedRewardBags = getSessionsAtTile(world?.sessions || [], t).flatMap((cs) => {
                        return getBagsAtEquipee(world?.bags || [], cs)
                            .filter((bag) => {
                                if (!cs.attackTile || cs.attackTile.tile.id !== t.id) {
                                    return false;
                                }
                                // reward containing bags have an ID that is made up of 16bits of sessionID and 48bits of MobileUnitID
                                // bagIDs are 64bits
                                const mobileUnitIdMask = BigInt('0xFFFFFFFFFFFF'); // 48bit mask (6 bytes)
                                const bagMobileUnitID = (BigInt(bag.id) >> BigInt(16)) & mobileUnitIdMask;
                                const truncatedMobileUnitID = BigInt(selectedMobileUnit.id) & mobileUnitIdMask;
                                return bagMobileUnitID === truncatedMobileUnitID;
                            })
                            ?.map((bag, equipIndex): SelectedBag => {
                                return {
                                    equipIndex,
                                    bag,
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
    }, [selectTiles, selectedMapElement, selectedMobileUnit, tiles, world]);

    const tileClick = useCallback(
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

    const mobileUnitClick = useCallback(
        (id) => {
            if (!selectMobileUnit || !selectTiles || !selectMapElement) {
                return;
            }

            selectMobileUnit(id);

            selectTiles(undefined);
            selectMapElement(undefined);
        },
        [selectMapElement, selectMobileUnit, selectTiles]
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
                    <Tiles tiles={tiles} onClickTile={tileClick} selectedTiles={selectedTiles} />
                    <MobileUnits
                        mobileUnits={world?.mobileUnits}
                        buildings={world?.buildings || []}
                        onClickMobileUnit={mobileUnitClick}
                        selectedMobileUnitID={selectedMobileUnit?.id}
                        playerID={player?.id}
                    />
                    <Bags
                        tiles={tiles || []}
                        world={world}
                        onClickBag={mapElementClick}
                        selectedMobileUnitID={selectedMobileUnit?.id}
                        selectedElementID={selectedMapElement?.id}
                    />
                    <TileGoos tiles={tiles} />
                    <Buildings
                        tiles={tiles || []}
                        buildings={world?.buildings || []}
                        onClickBuilding={mapElementClick}
                        selectedElementID={selectedMapElement?.id}
                    />
                    <CombatSessions tiles={tiles || []} sessions={world?.sessions || []} />
                </>
            )}
            <NavPanel />
            <div className="hud-container">
                <div className="top-left">
                    {world && player && <QuestPanel world={world} tiles={tiles || []} player={player} />}
                    {/* <Logs className="logs" /> */}
                </div>
                <div className="bottom-left">
                    <ItemPluginPanel ui={ui || []} />
                    <MobileUnitPanel />
                </div>
                <div className="top-middle"></div>
                <div className="bottom-middle">
                    <ActionContextPanel />
                    <ActionBar />
                </div>
                <div className="right">
                    {(!player || (player && playerUnits.length === 0)) && mapReady && connect && !loadingSession && (
                        <Onboarding player={player} playerUnits={playerUnits} onClickConnect={connect} />
                    )}
                    {player && playerUnits.length > 0 && <TileInfoPanel kinds={kinds || []} ui={ui || []} />}
                    {selectedTiles &&
                        selectedTiles.length > 0 &&
                        blockNumber &&
                        getSessionsAtTile(world?.sessions || [], selectedTiles[0]).filter((s) => !s.isFinalised)
                            .length > 0 && (
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
                                    <BagInventory
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
                                    <BagInventory
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

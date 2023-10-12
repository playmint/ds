import { BagFragment, WorldTileFragment } from '@app/../../core/src';
import { Buildings } from '@app/components/map/Buildings';
import { trackEvent } from '@app/components/organisms/analytics';
import { Logs } from '@app/components/organisms/logs';
import { Onboarding } from '@app/components/organisms/onboarding';
import { ItemPluginPanel } from '@app/components/panels/item-plugin-panel';
import { MobileUnitPanel } from '@app/components/panels/mobile-unit-panel';
import { NavPanel } from '@app/components/panels/nav-panel';
import { TileInfoPanel } from '@app/components/panels/tile-info-panel';
import { getTileDistance } from '@app/helpers/tile';
import { useBlock, useGameState, usePlayer } from '@app/hooks/use-game-state';
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
    const { world, selected, selectTiles, selectMapElement } = useGameState();
    const { loadingSession } = useSession();
    const player = usePlayer();
    const { mobileUnit: selectedMobileUnit, tiles: selectedTiles, mapElement: selectedMapElement } = selected || {};
    const blockNumber = useBlock();
    const { connect } = useWalletProvider();
    const [selectedBags, setSelectedBags] = useState<SelectedBag[]>();
    const tiles = world?.tiles;
    const selectedTileBags = selectedBags?.filter((sb) => !sb.isCombatReward);
    const selectedRewardBags = selectedBags?.filter((sb) => sb.isCombatReward);

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

    return (
        <StyledShell>
            {mapReady && (
                <>
                    <Buildings
                        buildings={world?.buildings}
                        onClickBuilding={mapElementClick}
                        selectedElementID={selectedMapElement?.id}
                    />
                </>
            )}
            <NavPanel />
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

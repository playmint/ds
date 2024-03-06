import { BagFragment, CogAction, QUEST_STATUS_ACCEPTED, WorldTileFragment } from '@app/../../core/src';
import { Bags } from '@app/components/map/Bag';
import { Buildings } from '@app/components/map/Buildings';
import { CombatSessions } from '@app/components/map/CombatSession';
import { GroundPlane } from '@app/components/map/GroundPlane';
import { MobileUnits } from '@app/components/map/MobileUnit';
import { Tiles } from '@app/components/map/Tile';
import { trackEvent } from '@app/components/organisms/analytics';
import { Onboarding } from '@app/components/organisms/onboarding';
import { ItemPluginPanel } from '@app/components/panels/item-plugin-panel';
import { MobileUnitPanel } from '@app/components/panels/mobile-unit-panel';
import { NavPanel } from '@app/components/panels/nav-panel';
import { TileInfoPanel } from '@app/components/panels/tile-info-panel';
import { getTileDistance } from '@app/helpers/tile';
import {
    useBlock,
    useBuildingKinds,
    useGameState,
    usePlayer,
    usePluginState,
    useQuestMessages,
} from '@app/hooks/use-game-state';
import { useSession } from '@app/hooks/use-session';
import { useUnityMap } from '@app/hooks/use-unity-map';
import { useWalletProvider } from '@app/hooks/use-wallet-provider';
import { ActionBar } from '@app/plugins/action-bar';
import { ActionContextPanel } from '@app/plugins/action-context-panel';
import { CombatSummary } from '@app/plugins/combat/combat-summary';
import { Bag as BagInventory } from '@app/plugins/inventory/bag';
import { ComponentProps } from '@app/types/component-props';
import { FunctionComponent, useCallback, useEffect, useMemo, useState, useRef } from 'react';
import styled from 'styled-components';
import { pipe, subscribe } from 'wonka';
import { styles } from './shell.styles';
import { QuestPanel } from '@app/components/panels/quest-panel';
import { getBagsAtEquipee, getBuildingAtTile, getSessionsAtTile } from '@downstream/core/src/utils';
import { StyledBasePanel, StyledHeaderPanel } from '@app/styles/base-panel.styles';
import { WalletItemsPanel } from '@app/components/panels/wallet-items-panel';

export interface ShellProps extends ComponentProps {}

const StyledShell = styled('div')`
    ${styles}
`;

const nullBytes24 = '0x' + '00'.repeat(24);

export type SelectedBag = {
    equipIndex: number;
    bag: BagFragment;
    ownerId: string;
    parentTile: WorldTileFragment;
    isCombatReward?: boolean;
};

export const Shell: FunctionComponent<ShellProps> = () => {
    const { ready: mapReady, setContainerStyle } = useUnityMap();
    const { world, selected, tiles, selectTiles, selectMobileUnit, selectMapElement, selectIntent } = useGameState();
    const { loadingSession } = useSession();
    const player = usePlayer();
    const playerUnits = world?.mobileUnits.filter((mu) => mu.owner && player && mu.owner.id === player.id) || [];
    const { mobileUnit: selectedMobileUnit, tiles: selectedTiles, mapElement: selectedMapElement } = selected || {};
    const blockNumber = useBlock() ?? 0;
    const { connect } = useWalletProvider();
    const [selectedBags, setSelectedBags] = useState<SelectedBag[]>();
    const selectedTileBags = selectedBags?.filter((sb) => !sb.isCombatReward);
    const selectedRewardBags = selectedBags?.filter((sb) => sb.isCombatReward);
    const kinds = useBuildingKinds();
    const ui = usePluginState();
    const [questsActive, setQuestsActive] = useState<boolean>(true);
    const toggleQuestsActive = useCallback(() => setQuestsActive((prev) => !prev), []);
    const [walletItemsActive, setWalletItemsActive] = useState<boolean>(false);
    const toggleWalletItemsActive = useCallback(() => setWalletItemsActive((prev) => !prev), []);
    const questMessages = useQuestMessages(10);
    const acceptedQuests = useMemo(() => {
        return (
            (player?.quests || []).filter((q) => q.status == QUEST_STATUS_ACCEPTED).sort((a, b) => a.key - b.key) || []
        );
    }, [player?.quests]);
    const unfinalisedCombatSessions = useMemo(
        () =>
            (world?.sessions || []).filter((s) => {
                const isNotFinalised = !s.isFinalised;
                const oneSideZero =
                    s.attackers.filter((paticipant) => paticipant.node.id != nullBytes24).length == 0 ||
                    s.defenders.filter((paticipant) => paticipant.node.id != nullBytes24).length == 0;
                const combatStarted = blockNumber && blockNumber >= (s.attackTile?.startBlock || 0);
                return isNotFinalised && (oneSideZero || combatStarted);
            }),

        [world?.sessions, blockNumber]
    );
    // Only attempt to finalise every other block to not hammer the server
    const combatSessionTick = Math.floor(blockNumber / 2);
    const [prevCombatSessionTick, setPrevCombatSessionTick] = useState<number>(0);

    useEffect(() => {
        if (combatSessionTick !== prevCombatSessionTick) {
            setPrevCombatSessionTick(combatSessionTick);
        }
    }, [combatSessionTick, prevCombatSessionTick]);

    // console.log(ui);
    const pluginTileProperties = ui?.flatMap((res) => res.state.map.filter((prop) => prop.type === 'tile')) || [];

    const displayBuildingDataModifiedByPlugins =
        ui?.flatMap((res) => res.state.map.filter((prop) => prop.type === 'building')) || [];

    const unitColorsModifiedByPlugins =
        ui?.flatMap((res) => res.state.map.filter((prop) => prop.type === 'unit')) || [];

    // setup the unity frame
    useEffect(() => {
        if (!setContainerStyle) {
            return;
        }
        setContainerStyle({
            position: 'fixed',
            display: 'block',
            width: '100%',
            height: '100%',
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
        });
    }, [setContainerStyle]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') {
                return true;
            }
            if (selectIntent) {
                selectIntent(undefined);
            }
            return true;
        };
        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [selectIntent]);

    // collect client dispatch analytics
    // TODO: move to analytics provider
    useEffect(() => {
        if (!player) {
            return;
        }
        const { unsubscribe } = pipe(
            player.dispatched,
            subscribe((event) => {
                event.actions.map((action) => {
                    const params: any = { action: action.name };
                    if (action.args.length > 0) {
                        if (action.name === 'COMPLETE_QUEST' || action.name === 'ACCEPT_QUEST') {
                            params.quest_id = `q${action.args[0]}`;
                        }
                    }
                    trackEvent('dispatch', params);
                });
            })
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
            case 'DisplayBuildingData':
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
                const selectedBags: SelectedBag[] = getBagsAtEquipee(world?.bags || [], t).map((bag): SelectedBag => {
                    return { equipIndex: bag.equipee?.key || 0, bag, ownerId: t.id, parentTile: t };
                });

                // Combat rewards
                if (selectedMobileUnit) {
                    const selectedRewardBags = getSessionsAtTile(world?.sessions || [], t).flatMap((cs) => {
                        return getBagsAtEquipee(world?.bags || [], cs)
                            .filter((bag) => {
                                if (!cs.defenceTile || cs.defenceTile.tile.id !== t.id) {
                                    return false;
                                }
                                // reward containing bags have an ID that is made up of 16bits of sessionID and 48bits of MobileUnitID
                                // bagIDs are 64bits
                                const mobileUnitIdMask = BigInt('0xFFFFFFFFFFFF'); // 48bit mask (6 bytes)
                                const bagMobileUnitID = (BigInt(bag.id) >> BigInt(16)) & mobileUnitIdMask;
                                const truncatedMobileUnitID = BigInt(selectedMobileUnit.id) & mobileUnitIdMask;
                                return bagMobileUnitID === truncatedMobileUnitID;
                            })
                            ?.map((bag): SelectedBag => {
                                return {
                                    equipIndex: bag.equipee?.key || 0,
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

    const unfinalisedCombatSessionsRef = useRef(unfinalisedCombatSessions);
    unfinalisedCombatSessionsRef.current = unfinalisedCombatSessions;

    // Auto finalise combat
    useEffect(() => {
        if (combatSessionTick == prevCombatSessionTick) {
            return;
        }
        if (!player) {
            return;
        }

        const sortedMobileUnits =
            world?.mobileUnits?.sort((a, b) => {
                const diffA = Math.abs((a.nextLocation?.time || 0) - blockNumber);
                const diffB = Math.abs((b.nextLocation?.time || 0) - blockNumber);
                return diffA - diffB;
            }) || [];

        let selectedIndex = -1;

        if (sortedMobileUnits.length > 0 && selectedMobileUnit) {
            for (let i = 0; i < sortedMobileUnits.length; i++) {
                if (sortedMobileUnits[i].id === selectedMobileUnit?.id) {
                    selectedIndex = i;
                    break;
                }
            }
        }

        const jitter = Math.random() * 500; // For cases where multiple units moved on the same block
        const sleepFor = selectedIndex > -1 ? selectedIndex * (1000 + jitter) : 0;

        if (unfinalisedCombatSessionsRef.current.length > 0) {
            const timeoutId = setTimeout(() => {
                const currentUnfinalisedCombatSessions = unfinalisedCombatSessionsRef.current;
                if (currentUnfinalisedCombatSessions.length > 0) {
                    const finaliseActions = currentUnfinalisedCombatSessions.map(
                        (s) =>
                            ({
                                name: 'FINALISE_COMBAT',
                                args: [s.id],
                            } as CogAction)
                    );

                    if (finaliseActions.length > 0) {
                        console.log(
                            `⚔️ Finalising combat because your selected unit was one of the last to move`,
                            finaliseActions
                        );
                        // player.dispatchAndWait(...finaliseActions).catch((err) => console.warn(err));

                        // Dispatching all at once could prevent future combat sessions from finalising if
                        // one of the finalise transactions fail so we dispatch them one by one
                        Promise.all(finaliseActions.map((action) => player.dispatchAndWait(action))).catch((err) =>
                            console.warn(err)
                        );
                    }
                    return () => clearTimeout(timeoutId);
                }
                return;
            }, sleepFor);
        }
    }, [combatSessionTick, player, prevCombatSessionTick, blockNumber, selectedMobileUnit, world?.mobileUnits]);

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
            if (!selectMobileUnit || !selectTiles || !selectMapElement || !player) {
                return;
            }
            if (world?.mobileUnits.find((u) => u.id === id)?.owner?.id === player.id) {
                selectMobileUnit(id);
                selectTiles(undefined);
            } else {
                const tileId = world?.mobileUnits.find((u) => u.id === id)?.nextLocation?.tile.id;
                if (tileId) selectTiles([tileId]);
            }
            selectMapElement(undefined);
        },
        [world, player, selectMapElement, selectMobileUnit, selectTiles]
    );

    const deselectAll = useCallback(() => {
        mapElementClick();
    }, [mapElementClick]);

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
                    <Tiles
                        tiles={tiles}
                        onClickTile={tileClick}
                        selectedTiles={selectedTiles}
                        pluginTileProperties={pluginTileProperties}
                    />
                    <MobileUnits
                        currentBlock={world?.block || 0}
                        mobileUnits={world?.mobileUnits}
                        buildings={world?.buildings || []}
                        onClickMobileUnit={mobileUnitClick}
                        selectedMobileUnitID={selectedMobileUnit?.id}
                        playerID={player?.id}
                        pluginProperties={unitColorsModifiedByPlugins}
                    />
                    <Bags
                        tiles={tiles || []}
                        world={world}
                        onClickBag={mapElementClick}
                        selectedMobileUnitID={selectedMobileUnit?.id}
                        selectedElementID={selectedMapElement?.id}
                    />
                    <Buildings
                        tiles={tiles || []}
                        buildings={world?.buildings || []}
                        onClickBuilding={mapElementClick}
                        selectedElementID={selectedMapElement?.id}
                        pluginBuildingProperties={displayBuildingDataModifiedByPlugins}
                    />
                    <CombatSessions tiles={tiles || []} sessions={world?.sessions || []} />
                </>
            )}
            <div className="hud-container">
                <div className="left">
                    <div className="top-left">
                        <NavPanel
                            questsActive={player && world && questsActive && acceptedQuests.length > 0}
                            toggleQuestsActive={toggleQuestsActive}
                            questsCount={acceptedQuests.length}
                            toggleWalletItemsActive={toggleWalletItemsActive}
                            walletItemsActive={walletItemsActive}
                        />
                        {world && player && questsActive && acceptedQuests.length > 0 && (
                            <QuestPanel
                                world={world}
                                tiles={tiles || []}
                                player={player}
                                acceptedQuests={acceptedQuests}
                                questMessages={questMessages}
                            />
                        )}
                        {world && player && walletItemsActive && (
                            <WalletItemsPanel player={player} blockNumber={blockNumber} />
                        )}
                    </div>
                    <ItemPluginPanel ui={ui || []} />
                    <div className="bottom-left">
                        <MobileUnitPanel />
                        <div className="flex-spacer"></div>
                        <div className="bottom-middle">
                            <ActionContextPanel pluginTileProperties={pluginTileProperties} />
                            <ActionBar />
                        </div>
                        <div className="flex-spacer"></div>
                    </div>
                </div>
                <div className="right no-scrollbars">
                    {(!player || (player && playerUnits.length === 0)) && mapReady && connect && !loadingSession && (
                        <Onboarding player={player} playerUnits={playerUnits} onClickConnect={connect} />
                    )}
                    {player && playerUnits.length > 0 && <TileInfoPanel kinds={kinds || []} ui={ui || []} />}
                    {selectedTiles &&
                        selectedTiles.length > 0 &&
                        blockNumber &&
                        getSessionsAtTile(world?.sessions || [], selectedTiles[0]).filter((s) => !s.isFinalised)
                            .length > 0 && (
                            <CombatSummary
                                className="action"
                                selectedTiles={selectedTiles}
                                world={world}
                                player={player}
                                selectedMobileUnit={selectedMobileUnit}
                                blockNumber={blockNumber}
                            />
                        )}
                    {selectedTileBags && selectedTileBags.length > 0 && (
                        <StyledBasePanel>
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
                        </StyledBasePanel>
                    )}
                    {selectedRewardBags && selectedRewardBags.length > 0 && (
                        <StyledHeaderPanel>
                            <div className="header">
                                <h3>Combat rewards</h3>
                            </div>
                            <div className="content">
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
                            </div>
                        </StyledHeaderPanel>
                    )}
                </div>
            </div>
        </StyledShell>
    );
};
export default Shell;

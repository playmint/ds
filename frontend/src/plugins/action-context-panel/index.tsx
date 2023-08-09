/** @format */
import { TileAction } from '@app/components/organisms/tile-action';
import { ComponentProps } from '@app/types/component-props';
import {
    BiomeKind,
    CogAction,
    ConnectedPlayer,
    SelectedMobileUnitFragment,
    SelectedTileFragment,
    Selector,
    useBuildingKinds,
    usePlayer,
    usePluginState,
    useSelection,
    useWorld,
    WorldBuildingFragment,
    BuildingKindFragment,
    WorldTileFragment
} from '@downstream/core';
import React, { Fragment, FunctionComponent, useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { useInventory } from '@app/plugins/inventory/inventory-provider';
import { getCoords, getTileDistance, getNeighbours } from '@app/helpers/tile';
import { BuildingInventory } from '@app/plugins/inventory/building-inventory';
import { getBuildingEquipSlot, getBuildingId } from '@app/plugins/inventory/helpers';
import { MobileUnitList } from '@app/plugins/mobile-unit-list';
import { TileInventory } from '@app/plugins/inventory/tile-inventory';
import { Bag } from '@app/plugins/inventory/bag';
import { styles } from './action-context-panel.styles';

export interface ActionContextPanelProps extends ComponentProps {
    onShowCombatModal?: (isNewSession: boolean) => void;
}

const CONSTRUCT_INTENT = 'construct';
const MOVE_INTENT = 'move';
const SCOUT_INTENT = 'scout';
const COMBAT_INTENT = 'combat';

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

const StyledActionContextPanel = styled('div')`
    ${styles}
`;

interface MaybeNamedThing {
    name?: {
        value: string;
    } | null;
}

interface KeyedThing {
    key: number;
}

const ImageConstruct = () => <img src="/tile-construct.png" alt="" className="building-image" width="33%" />;
const ImageAvailable = () => <img src="/tile-grass.png" alt="" className="building-image" />;
const ImageBuilding = () => <img src="/building-with-flag.png" alt="" className="building-image" />;
const ImageEnemy = () => <img src="/enemy.png" alt="" className="building-image" />;
const ImageScouting = () => <img src="/tile-scouting.png" alt="" className="building-image" width="33%" />;
const ImageSelecting = () => <img src="/tile-selecting.png" alt="" className="building-image" width="33%" />;

const byName = (a: MaybeNamedThing, b: MaybeNamedThing) => {
    return a.name && b.name && a.name.value > b.name.value ? 1 : -1;
};

const byKey = (a: KeyedThing, b: KeyedThing) => {
    return a.key > b.key ? 1 : -1;
};

interface TileBuildingProps {
    player?: ConnectedPlayer;
    building: WorldBuildingFragment;
    showFull: boolean;
    selectIntent: Selector<string | undefined>;
    selectTiles: Selector<string[] | undefined>;
}
const TileBuilding: FunctionComponent<TileBuildingProps> = ({ building, showFull, player }) => {
    const { tiles: selectedTiles } = useSelection();
    const selectedTile = selectedTiles?.[0];
    const tileMobileUnits = selectedTile?.mobileUnits ?? [];
    const ui = usePluginState();
    const kinds = useBuildingKinds();
    const component = (ui || [])
        .flatMap((p) => p.components)
        .filter((c) => c.type === 'building')
        .find(() => true);

    const buildingKind = (kinds || []).find((k) => k.id == building.kind?.id);
    const inputs = buildingKind?.inputs.sort(byKey) || [];
    const outputs = buildingKind?.outputs.sort(byKey) || [];

    const inputsRef = useRef<HTMLDivElement>(null);
    const outputsRef = useRef<HTMLDivElement>(null);
    const { addBagRef, removeBagRef } = useInventory();
    useEffect(() => {
        addBagRef(inputsRef);
        addBagRef(outputsRef);
        return () => {
            removeBagRef(inputsRef);
            removeBagRef(outputsRef);
        };
    }, [addBagRef, removeBagRef]);

    const inputBag = building.bags.find((b) => b.key == 0);
    const outputBag = building.bags.find((b) => b.key == 1);

    const isEnemy = buildingKind?.model?.value === 'enemy';

    return (
        <StyledActionContextPanel className="action">
            <h3>{component?.title ?? building?.kind?.name?.value ?? 'Unnamed Building'}</h3>
            <span className="sub-title">{component?.summary || ''}</span>
            {isEnemy ? <ImageEnemy /> : <ImageBuilding />}
            {component && showFull && (
                <Fragment>
                    <TileAction showTitle={false} component={component} className="action">
                        {inputs.length > 0 && inputBag && (
                            <div ref={inputsRef} className="ingredients">
                                <Bag
                                    bag={inputBag.bag}
                                    bagId={inputBag.bag.id}
                                    equipIndex={0}
                                    ownerId={building.id}
                                    isInteractable={true}
                                    recipe={inputs}
                                    numBagSlots={inputs.length}
                                    showIcon={false}
                                    as="li"
                                />
                            </div>
                        )}
                        {outputs.length > 0 && outputBag && (
                            <div className="process">
                                <img src="/icons/downarrow.png" alt="output" className="arrow" />
                            </div>
                        )}
                        {outputs.length > 0 && outputBag && (
                            <div ref={outputsRef} className="ingredients">
                                <Bag
                                    bag={outputBag.bag}
                                    bagId={outputBag.bag.id}
                                    equipIndex={1}
                                    ownerId={building.id}
                                    isInteractable={true}
                                    recipe={outputs}
                                    numBagSlots={outputs.length}
                                    showIcon={false}
                                    as="li"
                                />
                            </div>
                        )}
                    </TileAction>
                </Fragment>
            )}
            {!showFull && tileMobileUnits.length > 0 && (
                <MobileUnitList mobileUnits={tileMobileUnits} player={player} />
            )}
            {!showFull && selectedTile && <TileInventory tile={selectedTile} />}
        </StyledActionContextPanel>
    );
};

const TileMultiSelected: FunctionComponent<ActionContextPanelProps> = (_props) => {
    return (
        <StyledActionContextPanel className="action">
            <h3>Multiple Tiles Selected</h3>
            <span className="sub-title">Selecting...</span>
            <ImageAvailable />
        </StyledActionContextPanel>
    );
};

interface TileAvailableProps {
    player?: ConnectedPlayer;
}
const TileAvailable: FunctionComponent<TileAvailableProps> = ({ player }) => {
    const { tiles: selectedTiles } = useSelection();
    const selectedTile = selectedTiles?.[0];
    const tileMobileUnits = selectedTile?.mobileUnits ?? [];

    if (tileMobileUnits.length === 0 && selectedTile?.bags.length == 0) {
        return null;
    }

    return (
        <StyledActionContextPanel className="action">
            <h3 style={{ marginBottom: '2rem' }}>Tile contents</h3>
            {tileMobileUnits.length > 0 && (
                <Fragment>
                    <MobileUnitList mobileUnits={tileMobileUnits} player={player} />
                </Fragment>
            )}
            {selectedTile && <TileInventory tile={selectedTile} />}
        </StyledActionContextPanel>
    );
};

const TileUndiscovered: FunctionComponent<unknown> = (_props) => {
    return (
        <StyledActionContextPanel className="action">
            <h3>Undiscovered Tile</h3>
            <span className="sub-title">You can&apos;t make out this tile. Scouting should help!</span>
            <ImageAvailable />
        </StyledActionContextPanel>
    );
};

interface ConstructProps {
    selectedTiles: SelectedTileFragment[];
    selectIntent: Selector<string | undefined>;
    selectTiles: Selector<string[] | undefined>;
    player?: ConnectedPlayer;
    mobileUnit?: SelectedMobileUnitFragment;
}
const Construct: FunctionComponent<ConstructProps> = ({ selectedTiles, mobileUnit, player, selectIntent }) => {
    const [selectedKindRaw, selectKind] = useState<undefined | BuildingKindFragment>();
    const [showAllKinds, setShowAllKinds] = useState<boolean>(false);

    const selectedTile = selectedTiles.find(() => true);
    const selectedTileIsAdjacent =
        selectedTile && mobileUnit?.nextLocation?.tile
            ? getTileDistance(selectedTile, mobileUnit.nextLocation.tile) === 1
            : false;
    const constructableTile =
        !!selectedTile?.building ||
        !selectedTileIsAdjacent ||
        !selectedTile ||
        selectedTile.biome !== BiomeKind.DISCOVERED
            ? undefined
            : selectedTile;
    const constructionCoords = constructableTile ? getCoords(constructableTile) : undefined;
    const { addBagRef, removeBagRef } = useInventory();
    const world = useWorld();
    const slotsRef = useRef<HTMLDivElement>(null);
    const kinds = useBuildingKinds();
    const constructableKinds = (kinds || []).sort(byName);
    const playerKinds = constructableKinds.filter((kind) => kind.owner?.id === player?.id);
    const otherKinds = constructableKinds
        .filter((kind) => kind.owner?.id !== player?.id)
        .filter((kind) => kind.model?.value !== 'story-building');
    const selectedKind = selectedKindRaw;

    const onChangeSelectedKind = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const kindID = e.target.value;
        const kind = kindID ? constructableKinds.find((k) => k.id == kindID) : undefined;
        selectKind(kind);
    };

    // deselect kind if became unavailable
    useEffect(() => {
        if (!selectedKind) {
            return;
        }
        const selectableKinds = playerKinds.concat(otherKinds);
        if (!selectableKinds.some((kind) => kind.id === selectedKind.id)) {
            selectKind(undefined);
        }
        if (otherKinds.some((kind) => kind.id === selectedKind.id) && !showAllKinds) {
            selectKind(undefined);
        }
    }, [selectedKind, showAllKinds, selectKind, otherKinds, playerKinds]);

    const clearIntent = useCallback(
        (e?: React.MouseEvent) => {
            if (e) {
                e.preventDefault();
            }
            selectIntent(undefined);
        },
        [selectIntent]
    );

    const handleConstruct = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = new FormData(e.target as any);
        const data = Object.fromEntries(form.entries());
        if (!player) {
            return;
        }
        if (!mobileUnit) {
            return;
        }
        if (!constructableTile) {
            return;
        }

        player.dispatch({
            name: 'CONSTRUCT_BUILDING_MOBILE_UNIT',
            args: [
                mobileUnit.id,
                data.kind,
                constructableTile.coords[1],
                constructableTile.coords[2],
                constructableTile.coords[3]
            ]
        });
        clearIntent();
    };

    useEffect(() => {
        addBagRef(slotsRef);
        return () => removeBagRef(slotsRef);
    }, [addBagRef, removeBagRef]);

    const buildingId = constructionCoords
        ? getBuildingId(constructionCoords.q, constructionCoords.r, constructionCoords.s)
        : undefined;
    const equipIndex = 0;
    const equipSlot = buildingId ? getBuildingEquipSlot(world, buildingId, equipIndex) : undefined;
    const recipe = selectedKind?.materials.sort(byKey) || [];
    const canConstruct =
        recipe.every((ingredient, index) => {
            const bag = equipSlot && equipSlot.bag;
            return bag && bag.slots[index] && bag.slots[index].balance >= ingredient.balance;
        }) &&
        constructableTile &&
        selectedKind;

    const help = selectedTile?.building
        ? 'Can&apos;t build on a tile that already has a building on it'
        : constructableTile
        ? 'Select the type of building you&apos;d like to construct'
        : 'Choose an adjacent tile to build on';

    return (
        <StyledActionContextPanel className="action">
            <h3>Constructing</h3>
            <span className="sub-title">{help}</span>
            <ImageConstruct />
            <form onSubmit={handleConstruct}>
                {constructableTile && (
                    <>
                        <div className="select">
                            <select name="kind" onChange={onChangeSelectedKind} value={selectedKind?.id || ''}>
                                <option value={''}>Select...</option>
                                <optgroup label="Your kinds">
                                    {playerKinds.length > 0 ? (
                                        playerKinds.map((k) => (
                                            <option key={k.id} value={k.id}>
                                                {k.name?.value || k.id}
                                            </option>
                                        ))
                                    ) : (
                                        <option key="player-none" disabled={true}>
                                            You have not deployed any building kinds
                                        </option>
                                    )}
                                </optgroup>
                                <optgroup label="Other kinds">
                                    {showAllKinds ? (
                                        otherKinds.map((k) => (
                                            <option key={k.id} value={k.id}>
                                                {k.name?.value || k.id}
                                            </option>
                                        ))
                                    ) : (
                                        <option key="other" disabled={true}>
                                            {otherKinds.length} kinds hidden
                                        </option>
                                    )}
                                </optgroup>
                            </select>
                        </div>
                        <div className="toggle">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={showAllKinds}
                                    onChange={() => setShowAllKinds((prev) => !prev)}
                                />
                                Show all
                            </label>
                        </div>
                        {buildingId && (
                            <div ref={slotsRef} className="ingredients">
                                <BuildingInventory buildingId={buildingId} recipe={recipe} />
                            </div>
                        )}
                        <button className="action-button" type="submit" disabled={!canConstruct}>
                            Confirm Construction
                        </button>
                        <button className="secondary-action-button" onClick={clearIntent}>
                            Cancel Construction
                        </button>
                    </>
                )}
            </form>
        </StyledActionContextPanel>
    );
};

interface MoveProps {
    selectedTiles: SelectedTileFragment[];
    selectIntent: Selector<string | undefined>;
    selectTiles: Selector<string[] | undefined>;
    player?: ConnectedPlayer;
    mobileUnit?: SelectedMobileUnitFragment;
}
const Move: FunctionComponent<MoveProps> = ({ selectTiles, selectIntent, selectedTiles, player, mobileUnit }) => {
    const moveableTiles = selectedTiles
        .filter((t) => t.biome === BiomeKind.DISCOVERED)
        .filter((t, idx) => (idx === 0 ? t.id !== mobileUnit?.nextLocation?.tile?.id : true)); // map include the start tile in selection, ignore it
    const move = () => {
        if (!player) {
            return;
        }
        if (!mobileUnit) {
            return;
        }
        if (moveableTiles.length < 1) {
            return;
        }
        const actions = moveableTiles.map((tile): CogAction => {
            const [_zone, q, r, s] = tile.coords;
            return {
                name: 'MOVE_MOBILE_UNIT',
                args: [mobileUnit.key, q, r, s]
            };
        });
        actions.reduce(
            (chain, action) => chain.then(() => player.dispatch(action)).then(() => sleep(1500)),
            Promise.resolve()
        );
        if (selectIntent) {
            selectIntent(undefined);
        }
        if (selectTiles) {
            selectTiles([]);
        }
    };
    const canMove = mobileUnit && player && moveableTiles.length > 0;
    const clearIntent = useCallback(
        (e?: React.MouseEvent) => {
            if (e) {
                e.preventDefault();
            }
            selectIntent(undefined);
            selectTiles([]);
        },
        [selectIntent, selectTiles]
    );
    return (
        <StyledActionContextPanel className="action">
            <h3>Moving</h3>
            <span className="sub-title">Select a tile to add to path</span>
            <ImageSelecting />
            <form>
                <button
                    className="action-button"
                    type="button"
                    onClick={move}
                    disabled={!canMove}
                    style={{ opacity: canMove ? 1 : 0.1 }}
                >
                    Confirm Move
                </button>
                <button className="secondary-action-button" onClick={clearIntent}>
                    Cancel Move
                </button>
            </form>
        </StyledActionContextPanel>
    );
};

interface CombatProps {
    selectedTiles: SelectedTileFragment[];
    selectIntent: Selector<string | undefined>;
    selectTiles: Selector<string[] | undefined>;
    player?: ConnectedPlayer;
    mobileUnit?: SelectedMobileUnitFragment;
    onShowCombatModal?: (isNewSession: boolean) => void;
}
const Combat: FunctionComponent<CombatProps> = ({
    onShowCombatModal,
    selectTiles,
    selectIntent,
    selectedTiles,
    player,
    mobileUnit
}) => {
    const combatTiles = selectedTiles
        .filter((t) => t.biome === BiomeKind.DISCOVERED)
        .filter(({ sessions }) => {
            // cannot start combat if any of the tiles have an active session
            return sessions.filter((session: any) => !session.isFinalised).length == 0;
        });

    const canAttack =
        mobileUnit &&
        player &&
        combatTiles.length > 1 &&
        combatTiles[1].building &&
        getTileDistance(combatTiles[0], combatTiles[1]) == 1;

    const clearIntent = useCallback(
        (e?: React.MouseEvent) => {
            if (e) {
                e.preventDefault();
            }
            selectIntent(undefined);
            selectTiles([]);
        },
        [selectIntent, selectTiles]
    );

    const handleShowCombatModal = () => {
        onShowCombatModal && onShowCombatModal(true);
        selectIntent(undefined);
    };

    return (
        <StyledActionContextPanel className="action">
            <h3>Combat</h3>
            <span className="sub-title">Select a tile to add to combat</span>
            <ImageSelecting />
            <form>
                <button className="action-button" type="button" onClick={handleShowCombatModal} disabled={!canAttack}>
                    Start Combat
                </button>
                <button className="secondary-action-button" onClick={clearIntent}>
                    Cancel Combat
                </button>
            </form>
        </StyledActionContextPanel>
    );
};

interface ScoutProps {
    selectedTiles: SelectedTileFragment[];
    selectIntent: Selector<string | undefined>;
    selectTiles: Selector<string[] | undefined>;
    player?: ConnectedPlayer;
    mobileUnit?: SelectedMobileUnitFragment;
}
const Scout: FunctionComponent<ScoutProps> = ({ selectTiles, selectIntent, selectedTiles, player, mobileUnit }) => {
    const scoutableTiles = selectedTiles.filter((t) => t.biome === BiomeKind.UNDISCOVERED);
    const scout = () => {
        if (!player) {
            return;
        }
        if (!mobileUnit) {
            return;
        }
        const actions = scoutableTiles.map((tile): CogAction => {
            const [_zone, q, r, s] = tile.coords;
            return {
                name: 'SCOUT_MOBILE_UNIT',
                args: [mobileUnit.key, q, r, s]
            };
        });
        player.dispatch(...actions);
        if (selectIntent) {
            selectIntent(undefined);
        }
        if (selectTiles) {
            selectTiles([]);
        }
    };
    const clearIntent = useCallback(
        (e?: React.MouseEvent) => {
            if (e) {
                e.preventDefault();
            }
            selectIntent(undefined);
            selectTiles([]);
        },
        [selectIntent, selectTiles]
    );
    const canScout = mobileUnit && player && scoutableTiles.length > 0;
    const note = canScout ? 'Click scout to reveal selected tiles' : 'Select tiles you want to reveal';
    return (
        <StyledActionContextPanel className="action">
            <h3>Scouting</h3>
            <span className="sub-title">{note}</span>
            <ImageScouting />
            <form>
                <button
                    className="action-button"
                    type="button"
                    onClick={scout}
                    disabled={!canScout}
                    style={{ opacity: canScout ? 1 : 0.1 }}
                >
                    Confirm Scout
                </button>
                <button className="secondary-action-button" onClick={clearIntent}>
                    Cancel Scout
                </button>
            </form>
        </StyledActionContextPanel>
    );
};

export const ActionContextPanel: FunctionComponent<ActionContextPanelProps> = ({ onShowCombatModal }) => {
    const { selectIntent, intent, tiles, mobileUnit, selectTiles } = useSelection();
    const player = usePlayer();

    const selectedTiles = tiles || [];

    const world = useWorld();
    const worldTiles = world?.tiles || ([] as WorldTileFragment[]);
    const selectedMobileUnitTile: WorldTileFragment | undefined = mobileUnit?.nextLocation?.tile
        ? worldTiles.find((t) => t.id === mobileUnit.nextLocation?.tile?.id)
        : undefined;

    const useableTiles = selectedMobileUnitTile
        ? getNeighbours(worldTiles, selectedMobileUnitTile)
              .concat([selectedMobileUnitTile])
              .filter((t): t is WorldTileFragment => !!t && t.biome === BiomeKind.DISCOVERED && !!t.building)
        : [];

    const canUse = useableTiles.length > 0 && mobileUnit;

    if (intent === CONSTRUCT_INTENT) {
        return (
            <Construct
                selectIntent={selectIntent}
                selectedTiles={selectedTiles}
                selectTiles={selectTiles}
                mobileUnit={mobileUnit}
                player={player}
            />
        );
    } else if (intent === MOVE_INTENT) {
        return (
            <Move
                selectIntent={selectIntent}
                selectedTiles={selectedTiles}
                selectTiles={selectTiles}
                mobileUnit={mobileUnit}
                player={player}
            />
        );
    } else if (intent === SCOUT_INTENT) {
        return (
            <Scout
                selectIntent={selectIntent}
                selectedTiles={selectedTiles}
                selectTiles={selectTiles}
                mobileUnit={mobileUnit}
                player={player}
            />
        );
    } else if (intent === COMBAT_INTENT) {
        return (
            <Combat
                selectIntent={selectIntent}
                selectedTiles={selectedTiles}
                selectTiles={selectTiles}
                mobileUnit={mobileUnit}
                player={player}
                onShowCombatModal={onShowCombatModal}
            />
        );
    } else {
        if (selectedTiles.length === 1) {
            const selectedTile = selectedTiles[0];
            if (selectedTile.biome == BiomeKind.UNDISCOVERED) {
                return <TileUndiscovered />;
            } else if (!selectedTile.building) {
                return <TileAvailable player={player} />;
            } else if (selectedTile.building) {
                if (!canUse) {
                    return (
                        <TileBuilding
                            building={selectedTile.building}
                            showFull={false}
                            selectIntent={selectIntent}
                            selectTiles={selectTiles}
                        />
                    );
                } else {
                    return (
                        <TileBuilding
                            player={player}
                            building={selectedTile.building}
                            showFull={true}
                            selectIntent={selectIntent}
                            selectTiles={selectTiles}
                        />
                    );
                }
            } else {
                return null; // fallback, don't expect this state
            }
        } else if (selectedTiles.length > 1) {
            return <TileMultiSelected />;
        } else {
            return null;
        }
    }
};

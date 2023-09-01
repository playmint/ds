/** @format */
import { TileAction } from '@app/components/organisms/tile-action';
import { BuildingCategory, getBuildingCategory } from '@app/helpers/building';
import {
    getCoords,
    getGooRates,
    getNeighbours,
    getTileDistance,
    GOO_BLUE,
    GOO_GREEN,
    GOO_RED,
} from '@app/helpers/tile';
import { Bag } from '@app/plugins/inventory/bag';
import { getBagId, getBuildingId } from '@app/plugins/inventory/helpers';
import { useInventory } from '@app/plugins/inventory/inventory-provider';
import { TileInventory } from '@app/plugins/inventory/tile-inventory';
import { MobileUnitList } from '@app/plugins/mobile-unit-list';
import { ComponentProps } from '@app/types/component-props';
import {
    BiomeKind,
    BuildingKindFragment,
    CogAction,
    ConnectedPlayer,
    ItemSlotFragment,
    SelectedMobileUnitFragment,
    SelectedTileFragment,
    Selector,
    useBuildingKinds,
    usePlayer,
    usePluginState,
    useSelection,
    useWorld,
    World,
    WorldBuildingFragment,
    WorldTileFragment,
} from '@downstream/core';
import React, { Fragment, FunctionComponent, useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { styles } from './action-context-panel.styles';

export interface ActionContextPanelProps extends ComponentProps {
    onShowCombatModal?: (isNewSession: boolean) => void;
}

const CONSTRUCT_INTENT = 'construct';
const MOVE_INTENT = 'move';
const SCOUT_INTENT = 'scout';
const COMBAT_INTENT = 'combat';

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

const ImageBuilding = () => <img src="/building-with-flag.png" alt="" className="building-image" />;
const ImageEnemy = () => <img src="/enemy.png" alt="" className="building-image" />;

const byName = (a: MaybeNamedThing, b: MaybeNamedThing) => {
    return a.name && b.name && a.name.value > b.name.value ? 1 : -1;
};

const byKey = (a: KeyedThing, b: KeyedThing) => {
    return a.key > b.key ? 1 : -1;
};

interface TileBuildingProps {
    player?: ConnectedPlayer;
    building: WorldBuildingFragment;
    world?: World;
    showFull: boolean;
    selectIntent: Selector<string | undefined>;
    selectTiles: Selector<string[] | undefined>;
}
const TileBuilding: FunctionComponent<TileBuildingProps> = ({ building, showFull, world }) => {
    const { tiles: selectedTiles } = useSelection();
    const selectedTile = selectedTiles?.[0];
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

    const author = world?.players.find((p) => p.id === building?.kind?.owner?.id);
    const owner = world?.players.find((p) => p.id === building?.owner?.id);

    const name = building?.kind?.name?.value ?? 'Unnamed Building';
    const description = building?.kind?.description?.value;

    const { q, r, s } = selectedTile ? getCoords(selectedTile) : { q: 0, r: 0, s: 0 };
    const gooRates = selectedTile ? getGooRates(selectedTile) : [];
    const gooRatesInNameOrder = [GOO_RED, GOO_GREEN, GOO_BLUE]
        .map((idx) => gooRates.find((goo) => goo.index === idx))
        .filter((goo) => !!goo);
    console.log(gooRatesInNameOrder);

    return (
        <StyledActionContextPanel className="action">
            <h3>{name}</h3>
            {description && <span className="sub-title">{description}</span>}
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
            {!showFull && selectedTile && <TileInventory tile={selectedTile} />}
            <span className="label" style={{ width: '100%', marginTop: '2rem' }}>
                <strong>COORDINATES:</strong> {`${q}, ${r}, ${s}`}
            </span>
            {gooRatesInNameOrder.map((goo) => (
                <span key={goo?.name} className="label" style={{ width: '30%' }}>
                    <strong>{goo?.name.toUpperCase().slice(0, 1)}:</strong>{' '}
                    {`${Math.floor((goo?.gooPerSec || 0) * 100) / 100}/s`}
                </span>
            ))}
            {author && (
                <span className="label">
                    <strong>AUTHOR:</strong> {author.addr}
                </span>
            )}
            {owner && (
                <span className="label">
                    <strong>OWNER:</strong> {owner.addr}
                </span>
            )}
        </StyledActionContextPanel>
    );
};

interface TileAvailableProps {
    player?: ConnectedPlayer;
}
const TileAvailable: FunctionComponent<TileAvailableProps> = ({ player }) => {
    const { tiles: selectedTiles, mobileUnit: selectedMobileUnit } = useSelection();
    const selectedTile = selectedTiles?.[0];
    const tileMobileUnits = selectedTile?.mobileUnits ?? [];

    const excludeSelected = useCallback(
        (unit) => {
            if (!selectedMobileUnit) {
                return true;
            }
            return unit.id !== selectedMobileUnit.id;
        },
        [selectedMobileUnit]
    );

    const visibleUnits = tileMobileUnits.filter(excludeSelected);

    const lastTile = selectedTiles?.slice(-1, 1).find(() => true);
    if (!lastTile) {
        return null;
    }
    const { q, r, s } = getCoords(lastTile);
    const gooRates = getGooRates(lastTile);
    const topGooRate = gooRates.length > 0 ? Math.floor(gooRates[0].gooPerSec * 100) / 100 : 0;
    const topGooName = gooRates.length > 0 ? gooRates[0].name : '';
    const hasSomeGoo = topGooRate >= 0.1;
    const hasLotsGoo = topGooRate >= 0.3;
    const gooRatesInNameOrder = [GOO_RED, GOO_GREEN, GOO_BLUE]
        .map((idx) => gooRates.find((goo) => goo.index === idx))
        .filter((goo) => !!goo);

    const tileName = hasSomeGoo ? `${topGooName.toUpperCase()} GOO TILE` : `TILE`;
    const tileDescription = hasLotsGoo
        ? `A tile rich in ${topGooName} goo! ${topGooName} goo extractors will be very effective here`
        : hasSomeGoo
        ? `The tile has some ${topGooName} goo, extractors that need ${topGooName} goo will work well here`
        : undefined;

    return (
        <StyledActionContextPanel className="action">
            <h3 style={{ marginBottom: '2rem' }}>{tileName}</h3>
            <div className="description">{tileDescription}</div>
            {tileMobileUnits.length > 0 && (
                <Fragment>
                    <MobileUnitList mobileUnits={visibleUnits} player={player} tile={selectedTile} />
                </Fragment>
            )}
            {selectedTile && <TileInventory tile={selectedTile} />}
            <span className="label" style={{ width: '100%' }}>
                <strong>COORDINATES:</strong> {`${q}, ${r}, ${s}`}
            </span>
            {gooRatesInNameOrder.map((goo) => (
                <span key={goo?.name} className="label" style={{ width: '30%' }}>
                    <strong>{goo?.name.toUpperCase().slice(0, 1)}:</strong>{' '}
                    {`${Math.floor((goo?.gooPerSec || 0) * 100) / 100}/s`}
                </span>
            ))}
        </StyledActionContextPanel>
    );
};

const TileUndiscovered: FunctionComponent<unknown> = (_props) => {
    return (
        <StyledActionContextPanel className="action">
            <h3>Undiscovered Tile</h3>
            <span className="sub-title">You can&apos;t make out this tile. Scouting should help!</span>
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

type SlotSource = {
    bagId: string;
    equipKey: number;
    slotKey: number;
    balance: number;
};
type SlotMap = Map<string, SlotSource[]>;

interface BuildingKindWithOps extends BuildingKindFragment {
    ops: CogAction[] | undefined;
}

const Construct: FunctionComponent<ConstructProps> = ({ selectedTiles, mobileUnit, player, selectIntent }) => {
    const [selectedKindRaw, selectKind] = useState<undefined | BuildingKindWithOps>();
    const [showOnlyConstructable, setShowOnlyConstructable] = useState<boolean>(true);

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
    const kinds = useBuildingKinds();

    // build a map of itemid => {slotKey => balance} for player's inventories
    //
    const slotMap = mobileUnit?.bags
        .flatMap((equip) => equip.bag.slots.map((slot) => ({ slot, equip })))
        .reduce((slotMap, { equip, slot }) => {
            if (!slot.item) {
                return slotMap;
            }
            const slotSources = slotMap.has(slot.item.id) ? slotMap.get(slot.item.id) : [];
            if (!slotSources) {
                return slotMap;
            }
            slotSources.push({
                bagId: equip.bag.id,
                equipKey: equip.key,
                slotKey: slot.key,
                balance: slot.balance,
            });
            slotMap.set(slot.item.id, slotSources);
            return slotMap;
        }, new Map() as SlotMap);

    const targetBuildingId = constructionCoords
        ? getBuildingId(constructionCoords.q, constructionCoords.r, constructionCoords.s)
        : undefined;
    const targetBagId = targetBuildingId ? getBagId(targetBuildingId) : undefined;
    const targetEquipKey = 0;
    const getTransfersForRecipe = useCallback(
        (recipe: ItemSlotFragment[]): CogAction[] | undefined => {
            if (!slotMap) {
                return undefined;
            }
            if (!mobileUnit) {
                return undefined;
            }
            if (!targetBagId) {
                return undefined;
            }
            if (!targetBuildingId) {
                return undefined;
            }
            const got = recipe.map((slot) => slot.balance);
            const ops: CogAction[] = [];
            for (let i = 0; i < recipe.length; i++) {
                const available = slotMap.get(recipe[i].item.id);
                if (!available) {
                    return undefined;
                }
                for (let j = 0; j < available.length; j++) {
                    const take = Math.min(available[j].balance, got[i]);
                    got[i] -= take;
                    ops.push({
                        name: 'TRANSFER_ITEM_MOBILE_UNIT',
                        args: [
                            mobileUnit.id,
                            [mobileUnit.id, targetBuildingId],
                            [available[j].equipKey, targetEquipKey],
                            [available[j].slotKey, recipe[i].key],
                            targetBagId,
                            take,
                        ],
                    });
                }
            }
            const missing = got.reduce((sum, n) => (sum += n), 0);
            if (missing > 0) {
                return undefined;
            }
            return ops;
        },
        [slotMap, mobileUnit, targetBagId, targetBuildingId]
    );

    const kindsWithOps = (kinds || [])
        .sort(byName)
        .map((kind) => ({ ...kind, ops: getTransfersForRecipe(kind.materials.sort(byKey)) }));
    const constructableKinds = showOnlyConstructable
        ? kindsWithOps.filter((kind) => kind.ops && kind.ops.length > 0)
        : kindsWithOps;
    const playerKinds = constructableKinds.filter((kind) => kind.owner?.id === player?.id);
    const otherKinds = constructableKinds
        .filter((kind) => kind.owner?.id !== player?.id)
        .filter((kind) => getBuildingCategory(kind) == BuildingCategory.NONE);
    const extractorKinds = constructableKinds
        .filter((kind) => kind.owner?.id !== player?.id)
        .filter((kind) => getBuildingCategory(kind) == BuildingCategory.EXTRACTOR);
    const factoryKinds = constructableKinds
        .filter((kind) => kind.owner?.id !== player?.id)
        .filter((kind) => getBuildingCategory(kind) == BuildingCategory.ITEM_FACTORY);
    const blockerKinds = constructableKinds
        .filter((kind) => kind.owner?.id !== player?.id)
        .filter((kind) => getBuildingCategory(kind) == BuildingCategory.BLOCKER && kind.model?.value !== 'enemy');
    const enemyKinds = constructableKinds
        .filter((kind) => kind.owner?.id !== player?.id)
        .filter((kind) => getBuildingCategory(kind) == BuildingCategory.BLOCKER && kind.model?.value === 'enemy');
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
        if (!constructableKinds.some((kind) => kind.id === selectedKind.id)) {
            selectKind(undefined);
        }
    }, [selectedKind, selectKind, constructableKinds]);

    const clearIntent = useCallback(
        (e?: React.MouseEvent) => {
            if (e) {
                e.preventDefault();
            }
            selectIntent(undefined);
        },
        [selectIntent]
    );

    const canConstruct = selectedKind && selectedKind.ops && selectedKind.ops.length > 0 && constructableTile;

    const handleConstruct = useCallback(
        (e: React.FormEvent<HTMLFormElement>) => {
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
            if (!selectedKind || !selectedKind.ops) {
                return;
            }

            const ops: CogAction[] = [
                ...selectedKind.ops,
                {
                    name: 'CONSTRUCT_BUILDING_MOBILE_UNIT',
                    args: [
                        mobileUnit.id,
                        data.kind,
                        constructableTile.coords[1],
                        constructableTile.coords[2],
                        constructableTile.coords[3],
                    ],
                },
            ];

            player.dispatch(...ops).catch((err) => console.error(`failed construct`, err));
            clearIntent();
        },
        [player, mobileUnit, selectedKind, constructableTile, clearIntent]
    );
    const costs = selectedKind?.materials.map((slot) => `${slot.balance} ${slot.item?.name?.value || ''}`) || [];
    const help = selectedTile?.building
        ? `Can't build on a tile that already has a building on it`
        : constructableTile
        ? selectedKind
            ? `${selectedKind.description?.value || ''}`
            : `Select the type of building you'd like to construct`
        : 'Choose an adjacent tile to build on';

    return (
        <StyledActionContextPanel>
            <div className="control">
                <div className="guide">
                    <h3>{selectedKind ? selectedKind.name?.value : 'Construct...'}</h3>
                    <span className="sub-title">{help}</span>
                    {costs.map((cost, idx) => (
                        <div key={idx}>{cost}</div>
                    ))}
                </div>
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
                                    {constructableKinds.length === 0 && (
                                        <optgroup label="Other kinds">
                                            <option key="none" disabled={true}>
                                                You do not have enough materials to construct any buildings
                                            </option>
                                        </optgroup>
                                    )}
                                    {extractorKinds.length > 0 && (
                                        <optgroup label="Extractors">
                                            {extractorKinds.map((k) => (
                                                <option key={k.id} value={k.id}>
                                                    {k.name?.value || k.id}
                                                </option>
                                            ))}
                                        </optgroup>
                                    )}
                                    {blockerKinds.length > 0 && (
                                        <optgroup label="Blockers">
                                            {blockerKinds.map((k) => (
                                                <option key={k.id} value={k.id}>
                                                    {k.name?.value || k.id}
                                                </option>
                                            ))}
                                        </optgroup>
                                    )}
                                    {factoryKinds.length > 0 && (
                                        <optgroup label="Factories">
                                            {factoryKinds.map((k) => (
                                                <option key={k.id} value={k.id}>
                                                    {k.name?.value || k.id}
                                                </option>
                                            ))}
                                        </optgroup>
                                    )}
                                    {enemyKinds.length > 0 && (
                                        <optgroup label="Enemies">
                                            {enemyKinds.map((k) => (
                                                <option key={k.id} value={k.id}>
                                                    {k.name?.value || k.id}
                                                </option>
                                            ))}
                                        </optgroup>
                                    )}
                                    {otherKinds.length > 0 && (
                                        <optgroup label="Other kinds">
                                            {otherKinds.map((k) => (
                                                <option key={k.id} value={k.id}>
                                                    {k.name?.value || k.id}
                                                </option>
                                            ))}
                                        </optgroup>
                                    )}
                                </select>
                            </div>
                            <div className="toggle">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={showOnlyConstructable}
                                        onChange={() => setShowOnlyConstructable((prev) => !prev)}
                                    />
                                    <abbr title="Only show building kinds that can be constructed from materials in this unit's inventory">
                                        Hide unconstructable
                                    </abbr>
                                </label>
                            </div>
                        </>
                    )}
                    <button className="action-button" type="submit" disabled={!canConstruct}>
                        Confirm Construction
                    </button>
                    <button onClick={clearIntent} className="cancel">
                        <i className="bi bi-x" />
                    </button>
                </form>
            </div>
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
                args: [mobileUnit.key, q, r, s],
            };
        });
        actions
            .reduce((chain, action) => chain.then(() => player.dispatch(action)), Promise.resolve() as Promise<any>)
            .catch((err) => console.error('move chain failed', err));
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
        <StyledActionContextPanel>
            <div className="control">
                <div className="guide">
                    <h3>Moving</h3>
                    <span className="sub-title">Select a tile to add to path</span>
                </div>
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
                    <button onClick={clearIntent} className="cancel">
                        <i className="bi bi-x" />
                    </button>
                </form>
            </div>
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
    mobileUnit,
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
        <StyledActionContextPanel>
            <div className="control">
                <div className="guide">
                    <h3>Combat</h3>
                    <span className="sub-title">Select a tile to attack</span>
                </div>
                <form>
                    <button
                        className="action-button"
                        type="button"
                        onClick={handleShowCombatModal}
                        disabled={!canAttack}
                    >
                        Confirm Attack
                    </button>
                    <button onClick={clearIntent} className="cancel">
                        <i className="bi bi-x" />
                    </button>
                </form>
            </div>
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
                args: [mobileUnit.key, q, r, s],
            };
        });
        player.dispatch(...actions).catch((err) => console.error('scout failed', err));
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
        <StyledActionContextPanel>
            <div className="control">
                <div className="guide">
                    <h3>Scouting</h3>
                    <span className="sub-title">{note}</span>
                </div>
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
                    <button onClick={clearIntent} className="cancel">
                        <i className="bi bi-x" />
                    </button>
                </form>
            </div>
        </StyledActionContextPanel>
    );
};

export const TileInfoPanel: FunctionComponent<ActionContextPanelProps> = () => {
    const { selectIntent, tiles, mobileUnit, selectTiles } = useSelection();
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
    const selectedTile = selectedTiles?.slice(-1).find(() => true);

    if (selectedTile) {
        if (selectedTile.biome == BiomeKind.UNDISCOVERED) {
            return <TileUndiscovered />;
        } else if (!selectedTile.building) {
            return <TileAvailable player={player} />;
        } else if (selectedTile.building) {
            if (!canUse) {
                return (
                    <TileBuilding
                        building={selectedTile.building}
                        world={world}
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
                        world={world}
                        showFull={true}
                        selectIntent={selectIntent}
                        selectTiles={selectTiles}
                    />
                );
            }
        } else {
            return null; // fallback, don't expect this state
        }
    } else {
        return null;
    }
};

export const ActionContextPanel: FunctionComponent<ActionContextPanelProps> = ({ onShowCombatModal }) => {
    const { selectIntent, intent, tiles, mobileUnit, selectTiles } = useSelection();
    const player = usePlayer();

    const selectedTiles = tiles || [];

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
        return null;
    }
};

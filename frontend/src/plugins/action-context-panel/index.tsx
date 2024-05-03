import {
    BagFragment,
    BiomeKind,
    BuildingKindFragment,
    CogAction,
    ConnectedPlayer,
    ItemSlotFragment,
    PluginMapProperty,
    SelectedMapElement,
    Selector,
    WorldBuildingFragment,
    WorldMobileUnitFragment,
    WorldTileFragment,
} from '@app/../../core/src';
import { Path } from '@app/components/map/Path';
import { TileHighlight } from '@app/components/map/TileHighlight';
import { BuildingCategory, getBuildingCategory } from '@app/helpers/building';
import { getPath } from '@app/helpers/pathfinding';
import { getCoords, getTileDistance, getTileHeight, isBlockerTile } from '@app/helpers/tile';
import { useGlobal, usePlayer, useSelection, useZone } from '@app/hooks/use-game-state';
import { getBagId, getBuildingId } from '@app/plugins/inventory/helpers';
import { ComponentProps } from '@app/types/component-props';
import { WorldCombatSessionFragment } from '@downstream/core/src/gql/graphql';
import { getBagsAtEquipee, getBuildingAtTile, getSessionsAtTile } from '@downstream/core/src/utils';
import React, { FunctionComponent, Key, useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { styles } from './action-context-panel.styles';
import { ActionButton } from '@app/styles/button.styles';
import {
    Button,
    ComboBox,
    Input,
    Label,
    ListBox,
    ListBoxItem,
    Popover,
    Header,
    Section,
    Collection,
} from 'react-aria-components';

export interface ActionContextPanelProps extends ComponentProps {
    pluginTileProperties: PluginMapProperty[];
}

const CONSTRUCT_INTENT = 'construct';
const MOVE_INTENT = 'move';
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

const byName = (a: MaybeNamedThing, b: MaybeNamedThing) => {
    return a.name && b.name && a.name.value > b.name.value ? 1 : -1;
};

const byKey = (a: KeyedThing, b: KeyedThing) => {
    return a.key > b.key ? 1 : -1;
};

interface ConstructProps {
    selectedTiles: WorldTileFragment[];
    selectIntent?: Selector<string | undefined>;
    selectTiles?: Selector<string[] | undefined>;
    player?: ConnectedPlayer;
    tiles: WorldTileFragment[];
    pluginTileProperties: PluginMapProperty[];
    bags: BagFragment[];
    buildings: WorldBuildingFragment[];
    mobileUnit?: WorldMobileUnitFragment;
    setActionQueue: (path: CogAction[][]) => void;
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

const Construct: FunctionComponent<ConstructProps> = ({
    selectedTiles,
    mobileUnit,
    player,
    tiles,
    pluginTileProperties,
    bags,
    buildings,
    selectIntent,
    setActionQueue,
}) => {
    const [selectedKind, selectKind] = useState<undefined | BuildingKindWithOps>();
    const [showOnlyConstructable, setShowOnlyConstructable] = useState<boolean>(true);

    const { path, valid } = useMemo(() => {
        const fromTile = mobileUnit && tiles && tiles.find((t) => t.id === mobileUnit.nextLocation?.tile.id);
        if (!fromTile) {
            return { path: [], valid: false };
        }
        const toTile = selectedTiles.find(() => true);
        if (!toTile) {
            return { path: [], valid: false };
        }
        if (!tiles) {
            return { path: [], valid: false };
        }
        const path = getPath(tiles, pluginTileProperties, buildings, fromTile, toTile);
        const isImposible = path.length === 1 && getTileDistance(fromTile, toTile) > 1;
        const targetTile = path.slice(-1).find(() => true);
        const targetHasBuilding = targetTile ? getBuildingAtTile(buildings, targetTile) : false;
        return {
            path: path.length > 0 ? [fromTile, ...path] : [],
            valid: path.length > 0 && !isImposible && !targetHasBuilding,
        };
    }, [mobileUnit, tiles, selectedTiles, pluginTileProperties, buildings]);

    const selectedTile = selectedTiles.find(() => true);
    const selectedTileBuilding = selectedTile ? getBuildingAtTile(buildings, selectedTile) : null;
    const constructableTile =
        selectedTile && !selectedTileBuilding && selectedTile.biome === BiomeKind.DISCOVERED && valid
            ? selectedTile
            : undefined;
    const constructionCoords = constructableTile ? getCoords(constructableTile) : undefined;
    const global = useGlobal();
    const kinds = global?.buildingKinds || [];

    // build a map of itemid => {slotKey => balance} for player's inventories
    const mobileUnitBags = mobileUnit ? getBagsAtEquipee(bags, mobileUnit) : [];
    const slotMap = mobileUnitBags
        .flatMap((bag) => bag.slots.map((slot) => ({ slot, bag })))
        .reduce((slotMap, { slot, bag }) => {
            if (!slot.item) {
                return slotMap;
            }
            const slotSources = slotMap.has(slot.item.id) ? slotMap.get(slot.item.id) : [];
            if (!slotSources) {
                return slotMap;
            }
            if (!bag.equipee) {
                return slotMap;
            }
            slotSources.push({
                bagId: bag.id,
                equipKey: bag.equipee.key,
                slotKey: slot.key,
                balance: slot.balance,
            });
            slotMap.set(slot.item.id, slotSources);
            return slotMap;
        }, new Map() as SlotMap);

    const targetBuildingId = constructionCoords
        ? getBuildingId(constructionCoords.z, constructionCoords.q, constructionCoords.r, constructionCoords.s)
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
    const displayKinds = constructableKinds
        .filter((kind) => kind.owner?.id !== player?.id)
        .filter((kind) => getBuildingCategory(kind) == BuildingCategory.DISPLAY);
    const billboardKinds = constructableKinds
        .filter((kind) => kind.owner?.id !== player?.id)
        .filter((kind) => getBuildingCategory(kind) == BuildingCategory.BILLBOARD);

    const options = [
        {
            name: 'Your kinds',
            children:
                playerKinds.length > 0
                    ? playerKinds.map((kind) => ({
                          name: kind.name?.value || kind.id,
                          id: kind.id,
                      }))
                    : [
                          {
                              name: 'You have not deployed any building kinds',
                              id: 'player-none',
                          },
                      ],
        },
    ];

    constructableKinds.length === 0 &&
        options.push({
            name: 'Other kinds',
            children: [
                {
                    name: 'You do not have enough materials to construct any buildings',
                    id: 'none',
                },
            ],
        });

    extractorKinds.length > 0 &&
        options.push({
            name: 'Extractors',
            children: extractorKinds.map((kind) => ({
                name: kind.name?.value || kind.id,
                id: kind.id,
            })),
        });

    blockerKinds.length > 0 &&
        options.push({
            name: 'Blockers',
            children: blockerKinds.map((kind) => ({
                name: kind.name?.value || kind.id,
                id: kind.id,
            })),
        });

    factoryKinds.length > 0 &&
        options.push({
            name: 'Factories',
            children: factoryKinds.map((kind) => ({
                name: kind.name?.value || kind.id,
                id: kind.id,
            })),
        });

    enemyKinds.length > 0 &&
        options.push({
            name: 'Enemies',
            children: enemyKinds.map((kind) => ({
                name: kind.name?.value || kind.id,
                id: kind.id,
            })),
        });

    displayKinds.length > 0 &&
        options.push({
            name: 'Displays',
            children: displayKinds.map((kind) => ({
                name: kind.name?.value || kind.id,
                id: kind.id,
            })),
        });

    billboardKinds.length > 0 &&
        options.push({
            name: 'Billboards',
            children: billboardKinds.map((kind) => ({
                name: kind.name?.value || kind.id,
                id: kind.id,
            })),
        });

    otherKinds.length > 0 &&
        options.push({
            name: 'Other kinds',
            children: otherKinds.map((kind) => ({
                name: kind.name?.value || kind.id,
                id: kind.id,
            })),
        });

    const onChangeSelectedKind = (kindID: Key) => {
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
            if (!selectIntent) {
                return;
            }
            selectIntent(undefined);
        },
        [selectIntent]
    );

    const canConstruct = selectedKind && selectedKind.ops && selectedKind.ops.length > 0 && constructableTile;

    const handleConstruct = useCallback(
        (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            if (!constructableTile) {
                return;
            }
            if (!selectedKind || !selectedKind.ops) {
                return;
            }
            if (path.length < 2) {
                return;
            }
            const actions: CogAction[][] = [
                ...path.slice(1, -1).map((t) => {
                    const [zone, q, r, s] = t.coords;
                    return [
                        {
                            name: 'MOVE_MOBILE_UNIT',
                            args: [zone, q, r, s],
                        },
                    ] satisfies CogAction[];
                }),
                [
                    ...selectedKind.ops,
                    {
                        name: 'CONSTRUCT_BUILDING_MOBILE_UNIT',
                        args: [
                            selectedKind.id,
                            constructableTile.coords[0],
                            constructableTile.coords[1],
                            constructableTile.coords[2],
                            constructableTile.coords[3],
                        ],
                    },
                ],
            ];

            setActionQueue(actions);
            clearIntent();
        },
        [selectedKind, constructableTile, clearIntent, setActionQueue, path]
    );
    const costs = selectedKind?.materials.map((slot) => `${slot.balance} ${slot.item?.name?.value || ''}`) || [];
    const building = selectedTile ? getBuildingAtTile(buildings, selectedTile) : null;
    const help = building
        ? `Can't build on a tile that already has a building on it`
        : constructableTile
        ? selectedKind
            ? `${selectedKind.description?.value || ''}`
            : `Select the type of building you'd like to construct`
        : 'Select a tile to build on';

    return (
        <StyledActionContextPanel>
            {path.map((t, idx) => {
                const fromCoords = getCoords(t);
                const toCoords = idx + 1 < path.length ? getCoords(path[idx + 1]) : undefined;
                if (!toCoords) {
                    return null;
                }
                return (
                    <Path
                        key={`con-${t.id}`}
                        id={`con-${t.id}`}
                        qFrom={fromCoords.q}
                        rFrom={fromCoords.r}
                        sFrom={fromCoords.s}
                        heightFrom={getTileHeight(t)}
                        qTo={toCoords.q}
                        rTo={toCoords.r}
                        sTo={toCoords.s}
                        heightTo={getTileHeight(path[idx + 1])}
                        color={valid ? '#ff7315' : 'red'}
                    />
                );
            })}
            {constructableTile && constructionCoords && (
                <TileHighlight
                    key={`cons-${constructableTile.id}`}
                    id={`cons-${constructableTile.id}`}
                    height={getTileHeight(constructableTile)}
                    color="white"
                    style="gradient_outline"
                    animation="none"
                    {...constructionCoords}
                />
            )}
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
                        <ComboBox onSelectionChange={onChangeSelectedKind} disabledKeys={['player-none', 'none']}>
                            <Label />
                            <Input />
                            <Button>▼</Button>
                            <Popover>
                                <ListBox items={options}>
                                    {(section) => (
                                        <Section id={section.name}>
                                            <Header>{section.name}</Header>
                                            <Collection items={section.children}>
                                                {(item) => <ListBoxItem>{item.name}</ListBoxItem>}
                                            </Collection>
                                        </Section>
                                    )}
                                </ListBox>
                            </Popover>
                        </ComboBox>

                        <div className="toggle">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={showOnlyConstructable}
                                    onChange={() => setShowOnlyConstructable((prev) => !prev)}
                                />
                                <abbr title="Only show building kinds that can be constructed from materials in this unit's inventory">
                                    Constructable
                                </abbr>
                            </label>
                        </div>
                    </>
                )}
                <ActionButton type="submit" disabled={!canConstruct}>
                    Confirm
                </ActionButton>
                <button onClick={clearIntent} className="cancel">
                    <i className="bi bi-x" />
                </button>
            </form>
        </StyledActionContextPanel>
    );
};

interface MoveProps {
    selectedTiles: WorldTileFragment[];
    selectIntent?: Selector<string | undefined>;
    selectTiles?: Selector<string[] | undefined>;
    player?: ConnectedPlayer;
    tiles: WorldTileFragment[];
    pluginTileProperties: PluginMapProperty[];
    buildings: WorldBuildingFragment[];
    mobileUnit?: WorldMobileUnitFragment;
    setActionQueue: (path: CogAction[][]) => void;
}
const Move: FunctionComponent<MoveProps> = ({
    selectTiles,
    selectIntent,
    selectedTiles,
    tiles,
    pluginTileProperties,
    buildings,
    player,
    mobileUnit,
    setActionQueue,
}) => {
    const { path, valid } = useMemo(() => {
        const fromTile = mobileUnit && tiles && tiles.find((t) => t.id === mobileUnit.nextLocation?.tile.id);
        if (!fromTile) {
            return { path: [], valid: false };
        }
        const toTile = selectedTiles.find(() => true);
        if (!toTile) {
            return { path: [], valid: false };
        }
        if (!tiles) {
            return { path: [], valid: false };
        }
        const path = getPath(tiles, pluginTileProperties, buildings, fromTile, toTile);
        const isImposible = path.length === 1 && getTileDistance(fromTile, toTile) > 1;
        const targetTile = path.slice(-1).find(() => true);
        const targetBuilding = targetTile ? getBuildingAtTile(buildings, targetTile) : undefined;
        return {
            path: path.length > 0 ? [fromTile, ...path] : [],
            valid:
                path.length > 0 &&
                !isImposible &&
                !(targetTile && isBlockerTile(targetTile, pluginTileProperties)) &&
                getBuildingCategory(targetBuilding?.kind) != BuildingCategory.BLOCKER,
        };
    }, [mobileUnit, tiles, selectedTiles, pluginTileProperties, buildings]);

    const move = useCallback(() => {
        if (path.length < 2) {
            // first element is the origin
            return;
        }

        setActionQueue(
            path.slice(1).map((t) => {
                const [zone, q, r, s] = t.coords;
                return [
                    {
                        name: 'MOVE_MOBILE_UNIT',
                        args: [zone, q, r, s],
                    },
                ];
            })
        );
        if (selectIntent) {
            selectIntent(undefined);
        }
    }, [path, setActionQueue, selectIntent]);

    const canMove = mobileUnit && player && path.length > 0 && valid;

    const clearIntent = useCallback(
        (e?: React.MouseEvent) => {
            if (e) {
                e.preventDefault();
            }
            if (!selectIntent) {
                return;
            }
            if (!selectTiles) {
                return;
            }
            selectIntent(undefined);
            selectTiles([]);
        },
        [selectIntent, selectTiles]
    );

    return (
        <StyledActionContextPanel>
            {path.map((t, idx) => {
                const fromCoords = getCoords(t);
                const toCoords = idx + 1 < path.length ? getCoords(path[idx + 1]) : undefined;
                if (!toCoords) {
                    return null;
                }
                return (
                    <Path
                        key={`mv-${t.id}`}
                        id={`mv-${t.id}`}
                        qFrom={fromCoords.q}
                        rFrom={fromCoords.r}
                        sFrom={fromCoords.s}
                        heightFrom={getTileHeight(t)}
                        qTo={toCoords.q}
                        rTo={toCoords.r}
                        sTo={toCoords.s}
                        heightTo={getTileHeight(path[idx + 1])}
                        color={valid ? '#47E4FF' : 'red'}
                    />
                );
            })}
            <div className="guide">
                <h3>Moving</h3>
                <span className="sub-title">Select a tile to add to path</span>
            </div>
            <form>
                <ActionButton type="button" onClick={move} disabled={!canMove} style={{ opacity: canMove ? 1 : 0.1 }}>
                    Confirm
                </ActionButton>
                <button onClick={clearIntent} className="cancel">
                    <i className="bi bi-x" />
                </button>
            </form>
        </StyledActionContextPanel>
    );
};

interface CombatProps {
    selectedTiles: WorldTileFragment[];
    selectIntent?: Selector<string | undefined>;
    selectTiles?: Selector<string[] | undefined>;
    selectMapElement?: Selector<SelectedMapElement | undefined>;
    player?: ConnectedPlayer;
    tiles?: WorldTileFragment[];
    pluginTileProperties: PluginMapProperty[];
    sessions: WorldCombatSessionFragment[];
    buildings: WorldBuildingFragment[];
    mobileUnits: WorldMobileUnitFragment[];
    mobileUnit?: WorldMobileUnitFragment;
    setActionQueue: (path: CogAction[][]) => void;
}
const Combat: FunctionComponent<CombatProps> = ({
    selectTiles,
    selectMapElement,
    selectIntent,
    selectedTiles,
    mobileUnits,
    sessions,
    buildings,
    player,
    tiles,
    pluginTileProperties,
    mobileUnit,
    setActionQueue,
}) => {
    const clearIntent = useCallback(
        (e?: React.MouseEvent) => {
            if (e) {
                e.preventDefault();
            }
            if (!selectIntent) {
                return;
            }
            if (!selectTiles) {
                return;
            }
            selectIntent(undefined);
            selectTiles([]);
        },
        [selectIntent, selectTiles]
    );

    const { path, attackers, defenders, defenceTile, defenceTileBuilding, valid, reason } = useMemo(() => {
        if (!tiles) {
            return { path: [], valid: false, reason: 'no tiles' };
        }
        if (!mobileUnit) {
            return { path: [], valid: false, reason: 'no mobile unit selected' };
        }
        const selectedTile = selectedTiles.filter((t) => t.biome === BiomeKind.DISCOVERED).find(() => true);
        if (!selectedTile) {
            return { path: [], valid: false, reason: 'no selected tile' };
        }
        const selectedTileBuilding = getBuildingAtTile(buildings, selectedTile);
        const activeSession = getSessionsAtTile(sessions, selectedTile).find(() => true);
        if (!activeSession && !selectedTileBuilding) {
            return { path: [], valid: false, reason: 'no building to attack or session to join' };
        }
        const activeSessionAttackTile =
            activeSession && activeSession.attackTile?.tile
                ? tiles.find((t) => t.id === activeSession.attackTile?.tile.id)
                : undefined;
        const activeSessionDefenceTile =
            activeSession && activeSession.defenceTile?.tile
                ? tiles.find((t) => t.id === activeSession.defenceTile?.tile.id)
                : undefined;
        const toTile = activeSessionAttackTile || selectedTile;
        if (!toTile) {
            return { path: [], valid: false, reason: 'target tile not found' };
        }
        const fromTile = mobileUnit && tiles && tiles.find((t) => t.id === mobileUnit.nextLocation?.tile.id);
        if (!fromTile) {
            return { path: [], valid: false };
        }
        const pathToEitherBuildingOrAttackTile = getPath(tiles, pluginTileProperties, buildings, fromTile, toTile);
        const path = activeSessionAttackTile
            ? pathToEitherBuildingOrAttackTile
            : pathToEitherBuildingOrAttackTile.slice(0, -1);
        const defenceTile: WorldTileFragment = activeSessionDefenceTile || selectedTile;
        const defenceTileBuilding = getBuildingAtTile(buildings, defenceTile);
        if (!defenceTileBuilding) {
            return { path: [], valid: false, reason: 'no target building found' };
        }
        const destTile =
            getTileDistance(fromTile, defenceTile) <= 1 && !activeSessionAttackTile
                ? fromTile
                : path.slice(-1).find(() => true);
        if (!destTile) {
            return { path: [], valid: false, reason: 'no route to destination' };
        }
        const destTileHasDifferentActiveSession =
            activeSession && getSessionsAtTile(sessions, destTile).find(() => true)?.id !== activeSession.id;
        const isImposible = path.length === 1 && getTileDistance(fromTile, destTile) > 1;
        if (isImposible) {
            return { path: [], valid: false, reason: 'no route to destination' };
        }
        if (destTileHasDifferentActiveSession) {
            return { path: [], valid: false, reason: 'another combat already active, move to join the fight' };
        }
        const attackMobileUnits = (mobileUnits || []).filter((u) => u.nextLocation?.tile.id === destTile.id);
        const defenceMobileUnits = (mobileUnits || []).filter((u) => u.nextLocation?.tile.id === defenceTile.id);
        const destTileBuilding = getBuildingAtTile(buildings, destTile);
        return {
            path: [fromTile, ...path],
            valid: true,
            attackers: attackMobileUnits
                .filter((s) => s.id != mobileUnit.id)
                .map((s) => s.id)
                .concat(destTileBuilding ? [destTileBuilding.id] : [])
                .concat(mobileUnit.id),
            defenders: defenceMobileUnits.map((s) => s.id).concat(defenceTileBuilding ? [defenceTileBuilding.id] : []),
            defenceTile,
            defenceTileBuilding,
        };
    }, [mobileUnit, tiles, mobileUnits, selectedTiles, buildings, sessions, pluginTileProperties]);

    const attackTile = path.slice(-1).find(() => true);

    const canAttack = mobileUnit && player && valid && attackTile;
    const mobileUnitKey = mobileUnit?.key;
    const mobileUnitId = mobileUnit?.id;
    const mobileUnitLocation = mobileUnit?.nextLocation;

    const handleJoinCombat = useCallback(() => {
        if (!mobileUnitKey || !mobileUnitId) {
            return;
        }
        if (path.length == 0) {
            return;
        }
        if (!attackers || attackers.length === 0) {
            return;
        }
        const actions: CogAction[][] = path.slice(1).map((t) => {
            const [zone, q, r, s] = t.coords;
            return [
                {
                    name: 'MOVE_MOBILE_UNIT',
                    args: [zone, q, r, s],
                },
            ];
        });
        const hasActiveSession = getSessionsAtTile(sessions, defenceTile).some(() => true);
        if (!hasActiveSession) {
            actions.push([
                {
                    name: 'START_COMBAT',
                    args: [mobileUnitId, defenceTile.id, attackers, defenders],
                },
            ]);
            // deselect the building we are attacking otherwise the defence tile will be autoselected after clearIntent
            if (selectMapElement) {
                selectMapElement(undefined);
            }
        }

        setActionQueue(actions);
        if (clearIntent) {
            clearIntent();
        }

        // Select attack tile if we started a new combat session
        if (!hasActiveSession && selectTiles && mobileUnitLocation) {
            const attackTile = path[path.length - 1];
            selectTiles([attackTile.id]);
        }
    }, [
        mobileUnitKey,
        mobileUnitId,
        path,
        attackers,
        sessions,
        defenceTile,
        setActionQueue,
        clearIntent,
        selectTiles,
        mobileUnitLocation,
        defenders,
        selectMapElement,
    ]);

    const highlights: WorldTileFragment[] = [defenceTile, attackTile].filter((t): t is WorldTileFragment => !!t);
    const joining = attackTile && getSessionsAtTile(sessions, attackTile).some(() => true);
    const help = valid
        ? `Attack ${defenceTileBuilding?.kind?.name?.value}`
        : `Select a tile with a building to attack. ${reason}`;

    return (
        <StyledActionContextPanel>
            {path.map((t, idx) => {
                const fromCoords = getCoords(t);
                const toCoords = idx + 1 < path.length ? getCoords(path[idx + 1]) : undefined;
                if (!toCoords) {
                    return null;
                }
                return (
                    <Path
                        key={`com-${t.id}`}
                        id={`com-${t.id}`}
                        qFrom={fromCoords.q}
                        rFrom={fromCoords.r}
                        sFrom={fromCoords.s}
                        heightFrom={getTileHeight(t)}
                        qTo={toCoords.q}
                        rTo={toCoords.r}
                        sTo={toCoords.s}
                        heightTo={getTileHeight(path[idx + 1])}
                        color={valid ? 'green' : 'red'}
                    />
                );
            })}
            {highlights.map((t) => (
                <TileHighlight
                    key={`att-${t.id}`}
                    id={`att-${t.id}`}
                    height={getTileHeight(t) + 0.01}
                    color="red"
                    style="gradient_outline"
                    animation="none"
                    {...getCoords(t)}
                />
            ))}
            <div className="guide">
                <h3>Combat</h3>
                <span className="sub-title">{help}</span>
            </div>
            <form>
                <ActionButton type="button" onClick={handleJoinCombat} disabled={!canAttack}>
                    {joining ? 'Join' : 'Confirm'}
                </ActionButton>
                <ActionButton onClick={clearIntent} className="cancel">
                    <i className="bi bi-x" />
                </ActionButton>
            </form>
        </StyledActionContextPanel>
    );
};

export const ActionContextPanel: FunctionComponent<ActionContextPanelProps> = ({ pluginTileProperties }) => {
    const [actionQueue, setActionQueue] = useState<CogAction[][]>();
    const zone = useZone();
    const { tiles } = zone || {};
    const { selectIntent, intent, tiles: sTiles, mobileUnit, selectTiles, selectMapElement } = useSelection();
    const player = usePlayer();

    const selectedTiles = sTiles || [];
    const mobileUnitKey = mobileUnit?.key;
    const dispatch = player?.dispatch;

    useEffect(() => {
        if (!actionQueue || actionQueue.length === 0) {
            return;
        }
        const actions = actionQueue[0];
        if (!actions) {
            setActionQueue(undefined);
            return;
        }
        if (!dispatch) {
            return;
        }
        dispatch(...actions)
            .then((res) => res.wait())
            .then(() => {
                // remove this action from the top of the queue
                // ...but ONLY if the item is still at the top, since it
                // is possible that something else changed the queue while
                // we were dispatching
                setActionQueue((prev) => {
                    if (Array.isArray(prev) && prev.length > 0 && prev[0] === actions) {
                        return [...actionQueue.slice(1)];
                    }
                    return prev;
                });
            })
            .catch((err) => console.error(`move aborted ${err}`));
    }, [actionQueue, dispatch, mobileUnitKey]);

    if (!mobileUnit) {
        return null;
    }

    if (intent === CONSTRUCT_INTENT) {
        return (
            <Construct
                selectIntent={selectIntent}
                selectedTiles={selectedTiles}
                selectTiles={selectTiles}
                mobileUnit={mobileUnit}
                player={player}
                tiles={tiles || []}
                pluginTileProperties={pluginTileProperties || []}
                bags={zone?.bags || []}
                buildings={zone?.buildings || []}
                setActionQueue={setActionQueue}
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
                tiles={tiles || []}
                pluginTileProperties={pluginTileProperties || []}
                buildings={zone?.buildings || []}
                setActionQueue={setActionQueue}
            />
        );
    } else if (intent === COMBAT_INTENT) {
        return (
            <Combat
                selectIntent={selectIntent}
                selectedTiles={selectedTiles}
                selectTiles={selectTiles}
                selectMapElement={selectMapElement}
                mobileUnit={mobileUnit}
                mobileUnits={zone?.mobileUnits || []}
                player={player}
                tiles={tiles || []}
                pluginTileProperties={pluginTileProperties || []}
                buildings={zone?.buildings || []}
                sessions={zone?.sessions || []}
                setActionQueue={setActionQueue}
            />
        );
    } else {
        return null;
    }
};

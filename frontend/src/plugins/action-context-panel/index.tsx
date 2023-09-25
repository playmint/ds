import {
    BiomeKind,
    BuildingKindFragment,
    CogAction,
    ConnectedPlayer,
    ItemSlotFragment,
    SelectedMobileUnitFragment,
    SelectedTileFragment,
    Selector,
    WorldTileFragment,
} from '@app/../../core/src';
import { Path } from '@app/components/map/Path';
import { TileHighlight } from '@app/components/map/TileHighlight';
import { TileIcon } from '@app/components/map/TileIcon';
import { BuildingCategory, getBuildingCategory } from '@app/helpers/building';
import { getPath } from '@app/helpers/pathfinding';
import { getCoords, getTileDistance, getTileHeight } from '@app/helpers/tile';
import { useBuildingKinds, usePlayer, useSelection, useWorld } from '@app/hooks/use-game-state';
import { getBagId, getBuildingId } from '@app/plugins/inventory/helpers';
import { ComponentProps } from '@app/types/component-props';
import React, { FunctionComponent, useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { styles } from './action-context-panel.styles';

export interface ActionContextPanelProps extends ComponentProps {}

const CONSTRUCT_INTENT = 'construct';
const MOVE_INTENT = 'move';
// const SCOUT_INTENT = 'scout';
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
    selectedTiles: SelectedTileFragment[];
    selectIntent?: Selector<string | undefined>;
    selectTiles?: Selector<string[] | undefined>;
    player?: ConnectedPlayer;
    tiles: WorldTileFragment[] | undefined;
    mobileUnit?: SelectedMobileUnitFragment;
    setActivePath: (path: WorldTileFragment[]) => void;
    setDestinationAction: (op: CogAction[] | undefined) => void;
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
    selectIntent,
    setDestinationAction,
    setActivePath,
}) => {
    const [selectedKindRaw, selectKind] = useState<undefined | BuildingKindWithOps>();
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
        const path = getPath(tiles, fromTile, toTile);
        const isImposible = path.length === 1 && getTileDistance(fromTile, toTile) > 1;
        return {
            path: path.length > 0 ? [fromTile, ...path] : [],
            valid: path.length > 0 && !isImposible && !path.slice(-1).find(() => true)?.building,
        };
    }, [mobileUnit, selectedTiles, tiles]);

    const selectedTile = selectedTiles.find(() => true);
    const constructableTile =
        selectedTile && !selectedTile.building && selectedTile.biome === BiomeKind.DISCOVERED && valid
            ? selectedTile
            : undefined;
    const constructionCoords = constructableTile ? getCoords(constructableTile) : undefined;
    const kinds = useBuildingKinds();

    // build a map of itemid => {slotKey => balance} for player's inventories
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
            const form = new FormData(e.target as any);
            const data = Object.fromEntries(form.entries());
            if (!mobileUnit) {
                return;
            }
            if (!constructableTile) {
                return;
            }
            if (!selectedKind || !selectedKind.ops) {
                return;
            }
            if (path.length < 2) {
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
            const needToMove = path.slice(1, -1);
            if (needToMove.length > 0) {
                setActivePath(needToMove);
            }
            setDestinationAction(ops);
            clearIntent();
        },
        [mobileUnit, selectedKind, constructableTile, clearIntent, setDestinationAction, setActivePath, path]
    );
    const costs = selectedKind?.materials.map((slot) => `${slot.balance} ${slot.item?.name?.value || ''}`) || [];
    const help = selectedTile?.building
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
        </StyledActionContextPanel>
    );
};

interface MoveProps {
    selectedTiles: SelectedTileFragment[];
    selectIntent?: Selector<string | undefined>;
    selectTiles?: Selector<string[] | undefined>;
    player?: ConnectedPlayer;
    tiles: WorldTileFragment[] | undefined;
    mobileUnit?: SelectedMobileUnitFragment;
    setActivePath: (path: WorldTileFragment[]) => void;
    setDestinationAction: (op: CogAction[] | undefined) => void;
}
const Move: FunctionComponent<MoveProps> = ({
    selectTiles,
    selectIntent,
    selectedTiles,
    tiles,
    player,
    mobileUnit,
    setActivePath,
    setDestinationAction,
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
        const path = getPath(tiles, fromTile, toTile);
        const isImposible = path.length === 1 && getTileDistance(fromTile, toTile) > 1;
        return {
            path: path.length > 0 ? [fromTile, ...path] : [],
            valid:
                path.length > 0 &&
                !isImposible &&
                getBuildingCategory(path.slice(-1).find(() => true)?.building?.kind) != BuildingCategory.BLOCKER,
        };
    }, [mobileUnit, selectedTiles, tiles]);

    const move = useCallback(() => {
        if (path.length < 2) {
            // first element is the origin
            return;
        }
        setDestinationAction(undefined);
        setActivePath(path.slice(1));
        if (selectIntent) {
            selectIntent(undefined);
        }
    }, [path, setActivePath, setDestinationAction, selectIntent]);

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
        </StyledActionContextPanel>
    );
};

interface CombatProps {
    selectedTiles: SelectedTileFragment[];
    selectIntent?: Selector<string | undefined>;
    selectTiles?: Selector<string[] | undefined>;
    player?: ConnectedPlayer;
    tiles?: WorldTileFragment[];
    mobileUnit?: SelectedMobileUnitFragment;
    setActivePath: (path: WorldTileFragment[]) => void;
    setDestinationAction: (op: CogAction[] | undefined) => void;
}
const Combat: FunctionComponent<CombatProps> = ({
    selectTiles,
    selectIntent,
    selectedTiles,
    player,
    tiles,
    mobileUnit,
    setActivePath,
    setDestinationAction,
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

    const { path, attackers, defenders, defenceTile, valid, reason } = useMemo(() => {
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
        const activeSession = selectedTile.sessions.find((s) => !s.isFinalised);
        if (!activeSession && !selectedTile.building) {
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
        const pathToEitherBuildingOrAttackTile = getPath(tiles, fromTile, toTile);
        const path = activeSessionAttackTile
            ? pathToEitherBuildingOrAttackTile
            : pathToEitherBuildingOrAttackTile.slice(0, -1);
        const defenceTile: WorldTileFragment = activeSessionDefenceTile || selectedTile;
        if (!defenceTile.building) {
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
            activeSession && destTile.sessions.find((s) => !s.isFinalised)?.id !== activeSession.id;
        const isImposible = path.length === 1 && getTileDistance(fromTile, destTile) > 1;
        if (isImposible) {
            return { path: [], valid: false, reason: 'no route to destination' };
        }
        if (destTileHasDifferentActiveSession) {
            return { path: [], valid: false, reason: 'another combat already active, move to join the fight' };
        }
        return {
            path: [fromTile, ...path],
            valid: true,
            attackers: destTile.mobileUnits
                .map((s) => s.id)
                .concat(destTile.building ? [destTile.building.id] : [])
                .concat(mobileUnit.id),
            defenders: defenceTile.mobileUnits
                .map((s) => s.id)
                .concat(defenceTile.building ? [defenceTile.building.id] : []),
            defenceTile,
        };
    }, [mobileUnit, tiles, selectedTiles]);

    const attackTile = path.slice(-1).find(() => true);

    const canAttack = mobileUnit && player && valid && attackTile;
    if (!valid) {
        console.log('not valid cos', reason);
    }

    const handleJoinCombat = useCallback(() => {
        if (!mobileUnit) {
            return;
        }
        if (path.length == 0) {
            return;
        }
        if (!attackers || attackers.length === 0) {
            return;
        }
        const hasActiveSession = defenceTile.sessions.some((s) => !s.isFinalised);
        if (hasActiveSession) {
            setDestinationAction(undefined);
        } else {
            setDestinationAction([
                {
                    name: 'START_COMBAT',
                    args: [mobileUnit.id, defenceTile.id, attackers, defenders],
                },
            ]);
        }
        const needToMove = path.slice(1);
        setActivePath(needToMove);
        if (clearIntent) {
            clearIntent();
        }
    }, [setDestinationAction, setActivePath, clearIntent, path, mobileUnit, attackers, defenders, defenceTile]);

    const highlights: WorldTileFragment[] = [defenceTile, attackTile].filter((t): t is WorldTileFragment => !!t);
    const joining = attackTile && attackTile.sessions.some((s) => !s.isFinalised);
    const help = valid
        ? `Attack ${defenceTile?.building?.kind?.name?.value}`
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
                <button className="action-button" type="button" onClick={handleJoinCombat} disabled={!canAttack}>
                    {joining ? 'Join' : 'Confirm'} Attack
                </button>
                <button onClick={clearIntent} className="cancel">
                    <i className="bi bi-x" />
                </button>
            </form>
        </StyledActionContextPanel>
    );
};

export const ActionContextPanel: FunctionComponent<ActionContextPanelProps> = () => {
    const [destinationAction, setDestinationAction] = useState<CogAction[]>();
    const [activePath, setActivePath] = useState<WorldTileFragment[]>();
    const { selectIntent, intent, tiles, mobileUnit, selectTiles } = useSelection();
    const player = usePlayer();
    const world = useWorld();

    const selectedTiles = tiles || [];
    const mobileUnitKey = mobileUnit?.key;
    const dispatch = player?.dispatch;

    useEffect(() => {
        if (!activePath || activePath.length === 0) {
            return;
        }
        const t = activePath[0];
        if (!t) {
            // TODO: attempt action
            return;
        }
        if (!mobileUnitKey) {
            return;
        }
        if (!dispatch) {
            return;
        }
        const [_zone, q, r, s] = t.coords;
        dispatch({
            name: 'MOVE_MOBILE_UNIT',
            args: [mobileUnitKey, q, r, s],
        })
            .then((res) => res.wait())
            .then(() => {
                // remove this tile from the top of the active path list
                // ...but ONLY if the item is still at the top, since it
                // is possible that something else changed the path while
                // we were dispatching
                setActivePath((prev) => {
                    if (Array.isArray(prev) && prev.length > 0 && prev[0].id === t.id) {
                        return [...activePath.slice(1)];
                    }
                    return prev;
                });
            })
            .catch((err) => console.error(`move aborted ${err}`));
    }, [activePath, dispatch, mobileUnitKey]);

    useEffect(() => {
        if (!destinationAction) {
            return;
        }
        if (activePath && activePath.length > 0) {
            return;
        }
        if (!dispatch) {
            return;
        }
        setDestinationAction(undefined);
        dispatch(...destinationAction).catch((err) =>
            console.error(`failed to perform action: ${err}`, destinationAction)
        );
    }, [activePath, destinationAction, dispatch]);

    if (intent === CONSTRUCT_INTENT) {
        return (
            <Construct
                selectIntent={selectIntent}
                selectedTiles={selectedTiles}
                selectTiles={selectTiles}
                mobileUnit={mobileUnit}
                player={player}
                tiles={world?.tiles}
                setActivePath={setActivePath}
                setDestinationAction={setDestinationAction}
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
                tiles={world?.tiles}
                setActivePath={setActivePath}
                setDestinationAction={setDestinationAction}
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
                tiles={world?.tiles}
                setActivePath={setActivePath}
                setDestinationAction={setDestinationAction}
            />
        );
    } else {
        return null;
    }
};

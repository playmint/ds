/** @format */
import { TileAction } from '@app/components/organisms/tile-action';
import { ComponentProps } from '@app/types/component-props';
import {
    BiomeKind,
    CogAction,
    ConnectedPlayer,
    SelectedSeekerFragment,
    SelectedTileFragment,
    Selector,
    useBuildingKinds,
    usePlayer,
    usePluginState,
    useSelection,
    useWorld,
    WorldBuildingFragment
} from '@dawnseekers/core';
import React, { Fragment, FunctionComponent, useCallback, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { styles } from './building.styles';
import { useInventory } from '@app/plugins/inventory/inventory-provider';
import { getCoords, getTileDistance } from '@app/helpers/tile';
import { BuildingInventory } from '@app/plugins/inventory/building-inventory';
import { getBuildingEquipSlot, getBuildingId, resourceIds } from '@app/plugins/inventory/helpers';

export interface BuildingProps extends ComponentProps {}

const CONSTRUCT_INTENT = 'construct';
const MOVE_INTENT = 'move';
const SCOUT_INTENT = 'scout';

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

const StyledBuilding = styled('div')`
    ${styles}
`;

interface MaybeNamedThing {
    name?: {
        value: string;
    } | null;
}

const ImageConstruct = () => <img src="/tile-construct.png" alt="" className="building-image" width="33%" />;
const ImageAvailable = () => <img src="/tile-grass.png" alt="" className="building-image" />;
const ImageBuilding = () => <img src="/building-with-flag.png" alt="" className="building-image" />;
const ImageScouting = () => <img src="/tile-scouting.png" alt="" className="building-image" width="33%" />;
const ImageSelecting = () => <img src="/tile-selecting.png" alt="" className="building-image" width="33%" />;

const byName = (a: MaybeNamedThing, b: MaybeNamedThing) => {
    return a.name && b.name && a.name.value > b.name.value ? 1 : -1;
};

interface TileBuildingProps {
    building?: WorldBuildingFragment;
}
const TileBuilding: FunctionComponent<TileBuildingProps> = ({ building }) => {
    const ui = usePluginState();
    const component = (ui || [])
        .flatMap((p) => p.components)
        .filter((c) => c.type === 'building')
        .find(() => true);

    return (
        <Fragment>
            <h3>{component?.title ?? building?.kind?.name?.value ?? 'Unnamed Building'}</h3>
            <span className="sub-title">{component?.summary || ''}</span>
            <ImageBuilding />
            {component && <TileAction showTitle={false} component={component} className="action" />}
        </Fragment>
    );
};

const TileNoneSelected: FunctionComponent<BuildingProps> = (_props) => {
    return (
        <Fragment>
            <h3>No Tile Selected</h3>
            <span className="sub-title">Select a tile to see information</span>
            <ImageAvailable />
        </Fragment>
    );
};

const TileMultiSelected: FunctionComponent<BuildingProps> = (_props) => {
    return (
        <Fragment>
            <h3>Multiple Tiles Selected</h3>
            <span className="sub-title">Selecting...</span>
            <ImageAvailable />
        </Fragment>
    );
};

const TileAvailable: FunctionComponent<unknown> = () => {
    return (
        <Fragment>
            <h3>Available Tile</h3>
            <span className="sub-title">Nothing here yet</span>
            <ImageAvailable />
        </Fragment>
    );
};

const TileUndiscovered: FunctionComponent<unknown> = (_props) => {
    return (
        <Fragment>
            <h3>Undiscovered Tile</h3>
            <span className="sub-title">What could be here? scout to find out!</span>
            <ImageAvailable />
        </Fragment>
    );
};

interface ConstructProps {
    selectedTiles: SelectedTileFragment[];
    selectIntent: Selector<string | undefined>;
    selectTiles: Selector<string[] | undefined>;
    player?: ConnectedPlayer;
    seeker?: SelectedSeekerFragment;
}
const Construct: FunctionComponent<ConstructProps> = ({ selectedTiles, seeker, player, selectIntent }) => {
    // } else if (selectedTiles.length > 1) {
    //     return <ConstructMultiSelected />;
    // } else {
    //     return <ConstructNoneSelected />;
    // }
    // if (!seeker || !seeker.nextLocation || !player) {
    //     return <ConstructNoSeeker />;
    // } else if (selectedTile.biome == BiomeKind.UNDISCOVERED) {
    //     return <ConstructUndiscovered />;
    // } else if (selectedTile.building) {
    //     return <ConstructOcupied />;
    // } else if (getTileDistance(seeker.nextLocation.tile, selectedTile) !== 1) {
    //     return <ConstructTooFarAway />;
    const selectedTile = selectedTiles.find(() => true);
    const selectedTileIsAdjacent =
        selectedTile && seeker?.nextLocation?.tile
            ? getTileDistance(selectedTile, seeker.nextLocation.tile) === 1
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
        if (!seeker) {
            return;
        }
        if (!constructableTile) {
            return;
        }

        player.dispatch({
            name: 'CONSTRUCT_BUILDING_SEEKER',
            args: [
                seeker.id,
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
    const equipIndex = 0; // we don't have multi bag building recipes
    const equipSlot = buildingId ? getBuildingEquipSlot(world, buildingId, equipIndex) : undefined;
    const recipe = [
        {
            key: 0,
            balance: 100,
            item: {
                id: resourceIds.wood,
                kind: 'Resource'
            }
        }
    ];
    const canConstruct =
        recipe.every((ingredient, index) => {
            const bag = equipSlot && equipSlot.bag;
            return bag && bag.slots[index].balance === ingredient.balance;
        }) && selectedTiles.length > 0;

    const help = selectedTile?.building
        ? 'Can&apos;t construct on a tile that already has a building on it'
        : constructableTile
        ? 'Select what kind of building to construct'
        : 'Select an adjacent tile to construct on';

    return (
        <Fragment>
            <h3>Constructing</h3>
            <span className="sub-title">{help}</span>
            <ImageConstruct />
            <form onSubmit={handleConstruct}>
                <div className="select">
                    <select name="kind" placeholder="select kind">
                        {(kinds || []).sort(byName).map((k) => (
                            <option key={k.id} value={k.id}>
                                {k.name?.value || '<unnamed>'}
                            </option>
                        ))}
                    </select>
                </div>
                {buildingId && (
                    <div ref={slotsRef} className="ingredients">
                        <BuildingInventory buildingId={buildingId} recipe={recipe} />
                    </div>
                )}
                <button className="action-button" type="submit" disabled={!canConstruct}>
                    Confirm Construction
                </button>
                <button className="link-button" onClick={clearIntent}>
                    Cancel Construction
                </button>
            </form>
        </Fragment>
    );
};

interface MoveProps {
    selectedTiles: SelectedTileFragment[];
    selectIntent: Selector<string | undefined>;
    selectTiles: Selector<string[] | undefined>;
    player?: ConnectedPlayer;
    seeker?: SelectedSeekerFragment;
}
const Move: FunctionComponent<MoveProps> = ({ selectTiles, selectIntent, selectedTiles, player, seeker }) => {
    const moveableTiles = selectedTiles
        .filter((t) => t.biome === BiomeKind.DISCOVERED)
        .filter((t, idx) => (idx === 0 ? t.id !== seeker?.nextLocation?.tile?.id : true)); // map include the start tile in selection, ignore it
    const move = () => {
        if (!player) {
            return;
        }
        if (!seeker) {
            return;
        }
        if (moveableTiles.length < 1) {
            return;
        }
        const actions = moveableTiles.map((tile): CogAction => {
            const [_zone, q, r, s] = tile.coords;
            return {
                name: 'MOVE_SEEKER',
                args: [seeker.key, q, r, s]
            };
        });
        actions.reduce(
            (chain, action) => chain.then(() => player.dispatch(action)).then(() => sleep(5000)),
            Promise.resolve()
        );
        if (selectIntent) {
            selectIntent(undefined);
        }
        if (selectTiles) {
            selectTiles([]);
        }
    };
    const canMove = seeker && player && moveableTiles.length > 0;
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
        <Fragment>
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
                <button className="link-button" onClick={clearIntent}>
                    Cancel Move
                </button>
            </form>
        </Fragment>
    );
};
interface ScoutProps {
    selectedTiles: SelectedTileFragment[];
    selectIntent: Selector<string | undefined>;
    selectTiles: Selector<string[] | undefined>;
    player?: ConnectedPlayer;
    seeker?: SelectedSeekerFragment;
}
const Scout: FunctionComponent<ScoutProps> = ({ selectTiles, selectIntent, selectedTiles, player, seeker }) => {
    const scoutableTiles = selectedTiles.filter((t) => t.biome === BiomeKind.UNDISCOVERED);
    const scout = () => {
        if (!player) {
            return;
        }
        if (!seeker) {
            return;
        }
        const actions = scoutableTiles.map((tile): CogAction => {
            const [_zone, q, r, s] = tile.coords;
            return {
                name: 'SCOUT_SEEKER',
                args: [seeker.key, q, r, s]
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
    const canScout = seeker && player && scoutableTiles.length > 0;
    const note = canScout ? 'Click scout to reveal selected tiles' : 'Select tiles you want to reveal';
    return (
        <Fragment>
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
                <button className="link-button" onClick={clearIntent}>
                    Cancel Scout
                </button>
            </form>
        </Fragment>
    );
};

export const Building: FunctionComponent<BuildingProps> = ({ ...otherProps }) => {
    const { selectIntent, intent, tiles, seeker, selectTiles } = useSelection();
    const player = usePlayer();

    const selectedTiles = tiles || [];

    const content = (() => {
        if (intent === CONSTRUCT_INTENT) {
            return (
                <Construct
                    selectIntent={selectIntent}
                    selectedTiles={selectedTiles}
                    selectTiles={selectTiles}
                    seeker={seeker}
                    player={player}
                />
            );
        } else if (intent === MOVE_INTENT) {
            return (
                <Move
                    selectIntent={selectIntent}
                    selectedTiles={selectedTiles}
                    selectTiles={selectTiles}
                    seeker={seeker}
                    player={player}
                />
            );
        } else if (intent === SCOUT_INTENT) {
            return (
                <Scout
                    selectIntent={selectIntent}
                    selectedTiles={selectedTiles}
                    selectTiles={selectTiles}
                    seeker={seeker}
                    player={player}
                />
            );
        } else {
            if (selectedTiles.length === 1) {
                const selectedTile = selectedTiles[0];
                if (selectedTile.biome == BiomeKind.UNDISCOVERED) {
                    return <TileUndiscovered />;
                } else if (!selectedTile.building) {
                    return <TileAvailable />;
                } else if (selectedTile.building) {
                    return <TileBuilding building={selectedTile.building} />;
                } else {
                    return <TileNoneSelected />; // fallback, don't expect this state
                }
            } else if (selectedTiles.length > 1) {
                return <TileMultiSelected />;
            } else {
                return <TileNoneSelected />;
            }
        }
    })();

    return <StyledBuilding {...otherProps}>{content}</StyledBuilding>;
};

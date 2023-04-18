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
    WorldBuildingFragment
} from '@dawnseekers/core';
import { ethers } from 'ethers';
import { Fragment, FunctionComponent, useCallback } from 'react';
import styled from 'styled-components';
import { styles } from './building.styles';

export interface BuildingProps extends ComponentProps {}

const CONSTRUCT_INTENT = 'construct';
const MOVE_INTENT = 'move';
const SCOUT_INTENT = 'scout';

const StyledBuilding = styled('div')`
    ${styles}
`;

interface MaybeNamedThing {
    name?: {
        value: string;
    } | null;
}

const ImageConstruct = () => <img src="/tile-construct.png" alt="" className="building-image" />;
const ImageAvailable = () => <img src="/tile-grass.png" alt="" className="building-image" />;
const ImageBuilding = () => <img src="/building-with-flag.png" alt="" className="building-image" />;

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

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

interface MoveProps {
    selectedTiles: SelectedTileFragment[];
    selectIntent: Selector<string | undefined>;
    selectTiles: Selector<string[] | undefined>;
    player?: ConnectedPlayer;
    seeker?: SelectedSeekerFragment;
}
const Move: FunctionComponent<MoveProps> = ({ selectTiles, selectIntent, selectedTiles, player, seeker }) => {
    const moveableTiles = selectedTiles.filter((t) => t.biome === BiomeKind.DISCOVERED);
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
    return (
        <Fragment>
            <h3>Moving</h3>
            <span className="sub-title">Travel to selected tile</span>
            <ImageAvailable />
            {canMove && (
                <button className="action-button" onClick={move}>
                    Move
                </button>
            )}
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
    const canScout = seeker && player && scoutableTiles.length > 0;
    const note = canScout ? 'Click scout to reveal selected tiles' : 'Select tiles you want to reveal';
    return (
        <Fragment>
            <h3>Scouting</h3>
            <span className="sub-title">{note}</span>
            <ImageAvailable />
            {canScout && (
                <button className="action-button" onClick={scout}>
                    Scout
                </button>
            )}
        </Fragment>
    );
};

const TileUndiscovered: FunctionComponent<unknown> = (_props) => {
    return (
        <Fragment>
            <h3>Undiscovered Tile</h3>
            <span className="sub-title">What could be here? Scout to reveal!</span>
            <ImageAvailable />
        </Fragment>
    );
};

const ConstructNoneSelected: FunctionComponent<unknown> = (_props) => {
    return (
        <Fragment>
            <h3>Construct</h3>
            <span className="sub-title">Choose a tile to construct</span>
            <ImageConstruct />
        </Fragment>
    );
};

const ConstructMultiSelected: FunctionComponent<unknown> = (_props) => {
    return (
        <Fragment>
            <h3>Construct</h3>
            <span className="sub-title">Multiple tiles selected, pick a single tile to construct</span>
            <ImageConstruct />
        </Fragment>
    );
};

const ConstructUndiscovered: FunctionComponent<unknown> = (_props) => {
    return (
        <Fragment>
            <h3>Construct</h3>
            <span className="sub-title">Can&apos;t construct on an undisocvered tile</span>
            <ImageConstruct />
        </Fragment>
    );
};

interface ConstructAvailableProps {
    tile: SelectedTileFragment;
    selectIntent: Selector<string | undefined>;
    player: ConnectedPlayer;
    seeker: SelectedSeekerFragment;
}
const ConstructAvailable: FunctionComponent<ConstructAvailableProps> = ({ tile, seeker, player, selectIntent }) => {
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
        // TODO/FIXME: allow choosing where to pay from, not assume seeker/0/0
        player.dispatch({
            name: 'CONSTRUCT_BUILDING_SEEKER',
            args: [
                seeker.id,
                data.kind,
                seeker.id, // pay from thing
                0, // ...from bag at equip-slot
                0, // ... from item in item-slot
                tile.coords[1],
                tile.coords[2],
                tile.coords[3]
            ]
        });
        clearIntent();
    };

    return (
        <Fragment>
            <h3>Construct</h3>
            <span className="sub-title">Select what kind of building to construct</span>
            <ImageConstruct />
            <form onSubmit={handleConstruct}>
                <select name="kind" placeholder="select kind">
                    {(kinds || []).sort(byName).map((k) => (
                        <option key={k.id} value={k.id}>
                            {k.name?.value || '<unnamed>'}
                        </option>
                    ))}
                </select>
                <button className="action-button" type="submit">
                    Construct It!
                </button>
                <a href="#cancel" className="secondary-button" onClick={clearIntent}>
                    Cancel Construction
                </a>
            </form>
        </Fragment>
    );
};

const ConstructOcupied: FunctionComponent<unknown> = (_props) => {
    return (
        <Fragment>
            <h3>Construct</h3>
            <span className="sub-title">Can&apos;t construct on a tile that already has a building on it</span>
            <ImageConstruct />
        </Fragment>
    );
};

const ConstructNoSeeker: FunctionComponent<unknown> = (_props) => {
    return (
        <Fragment>
            <h3>Construct</h3>
            <span className="sub-title">Must have a seeker selected</span>
            <ImageConstruct />
        </Fragment>
    );
};

const ConstructTooFarAway: FunctionComponent<unknown> = (_props) => {
    return (
        <Fragment>
            <h3>Construct</h3>
            <span className="sub-title">Select an adjacent tile to start construction</span>
            <ImageConstruct />
        </Fragment>
    );
};

export const Building: FunctionComponent<BuildingProps> = ({ ...otherProps }) => {
    const { selectIntent, intent: rawIntent, tiles, seeker, selectTiles } = useSelection();
    const intent = (rawIntent || '').toLowerCase();
    const player = usePlayer();
    const selectedTiles = tiles || [];

    const content = (() => {
        if (intent === CONSTRUCT_INTENT) {
            // design says these states should be in a pop-out UI, inline until we have that UI
            if (selectedTiles.length === 1) {
                const selectedTile = selectedTiles[0];
                if (!seeker || !seeker.nextLocation || !player) {
                    return <ConstructNoSeeker />;
                } else if (selectedTile.biome == BiomeKind.UNDISCOVERED) {
                    return <ConstructUndiscovered />;
                } else if (selectedTile.building) {
                    return <ConstructOcupied />;
                } else if (getTileDistance(seeker.nextLocation.tile, selectedTile) !== 1) {
                    return <ConstructTooFarAway />;
                } else {
                    return (
                        <ConstructAvailable
                            selectIntent={selectIntent}
                            tile={selectedTile}
                            seeker={seeker}
                            player={player}
                        />
                    );
                }
            } else if (selectedTiles.length > 1) {
                return <ConstructMultiSelected />;
            } else {
                return <ConstructNoneSelected />;
            }
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

type Coords = Array<any>;
interface Locatable {
    coords: Coords;
}

function getTileDistance(t1: Locatable, t2: Locatable): number {
    if (!t1 || !t2) {
        return Infinity;
    }
    const a = getCoords(t1);
    const b = getCoords(t2);
    return (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.s - b.s)) / 2;
}

function getCoords(t: Locatable) {
    return {
        q: Number(ethers.fromTwos(t.coords[1], 16)),
        r: Number(ethers.fromTwos(t.coords[2], 16)),
        s: Number(ethers.fromTwos(t.coords[3], 16))
    };
}

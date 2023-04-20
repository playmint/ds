/** @format */
import { TileAction } from '@app/components/organisms/tile-action';
import { ComponentProps } from '@app/types/component-props';
import {
    BiomeKind,
    CompoundKeyEncoder,
    ConnectedPlayer,
    NodeSelectors,
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
import { AbiCoder, ethers } from 'ethers';
import React, { Fragment, FunctionComponent, useCallback, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { styles } from './building.styles';
import { resourceIds } from '@app/plugins/inventory/helpers';
import { useInventory } from '@app/plugins/inventory/inventory-provider';
import { BagSlot } from '@app/plugins/inventory/bag-slot';

export interface BuildingProps extends ComponentProps {}

const CONSTRUCT_INTENT = 'construct';

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

const TileUndiscovered: FunctionComponent<unknown> = (_props) => {
    return (
        <Fragment>
            <h3>Undiscovered Tile</h3>
            <span className="sub-title">What could be here? scout to find out!</span>
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
    const { addBagRef, removeBagRef } = useInventory();
    const world = useWorld();
    const slotsRef = useRef<HTMLUListElement>(null);
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

        player.dispatch({
            name: 'CONSTRUCT_BUILDING_SEEKER',
            args: [seeker.id, data.kind, tile.coords[1], tile.coords[2], tile.coords[3]]
        });
        clearIntent();
    };

    useEffect(() => {
        addBagRef(slotsRef);
        return () => removeBagRef(slotsRef);
    }, [addBagRef, removeBagRef]);

    if (!tile) {
        return null;
    }

    const coords = getCoords(tile);
    const buildingId = CompoundKeyEncoder.encodeInt16(NodeSelectors.Building, 0, coords.q, coords.r, coords.s);
    const keccak256Hash = ethers.keccak256(AbiCoder.defaultAbiCoder().encode(['bytes24'], [buildingId]));
    const uint64Hash = BigInt(keccak256Hash) % BigInt(2 ** 64);
    const bagId = CompoundKeyEncoder.encodeUint160(NodeSelectors.Bag, uint64Hash);

    // fetch our building bag slot if it already exists
    const building = world?.buildings?.find((b) => b.id === buildingId);
    const equipSlot = building?.bags[0];
    const slot = equipSlot && equipSlot.bag.slots[0];

    return (
        <Fragment>
            <h3>Construct</h3>
            <span className="sub-title">Select what kind of building to construct</span>
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
                <ul ref={slotsRef} className="ingredients">
                    <li>
                        {/*// todo figure out if we are pending a resource transfer*/}
                        <BagSlot
                            itemSlot={slot}
                            ownerId={buildingId}
                            bagId={bagId}
                            equipIndex={0}
                            slotKey={0}
                            placeholder={{
                                key: 0,
                                balance: 100,
                                item: {
                                    id: resourceIds.unknown,
                                    kind: 'Resource'
                                }
                            }}
                            isInteractable={true}
                        />
                    </li>
                </ul>
                <input name="buildingId" value={buildingId} type="hidden" />
                {/*// todo disable the construct button if we don't have resources */}
                <button className="action-button" type="submit">
                    Construct It!
                </button>
                <button className="link-button" onClick={clearIntent}>
                    Cancel Construction
                </button>
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
    const { selectIntent, intent, tiles, seeker } = useSelection();
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

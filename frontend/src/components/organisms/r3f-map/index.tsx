import { ComponentProps } from '@app/types/component-props';
import { Cylinder, Edges, GradientTexture, Html, MapControls, OrthographicCamera } from '@react-three/drei';
import { Canvas, ThreeEvent, useFrame } from '@react-three/fiber';
import chroma from 'chroma-js';
import { Fragment, FunctionComponent, Suspense, useContext, useRef, useState } from 'react';
import styled from 'styled-components';
import { styles } from './styles';
// import { Model as Blockyman } from './Blockyman';
import {
    BiomeKind,
    ConnectedPlayer,
    PluginState,
    SelectedSeekerFragment,
    SelectedTileFragment,
    Selector,
    useGameState,
    usePlayer,
    usePluginState,
    useSelection,
    WorldBuildingFragment,
    WorldSeekerFragment,
    WorldTileFragment
} from '@app/../../core/dist/core';
import { Building as TileInfo } from '@app/plugins/building';
import { Inventory } from '@app/plugins/inventory';
import { useInventoryContext } from '@app/plugins/inventory/inventory-provider';
import { SeekerInventory } from '@app/plugins/inventory/seeker-inventory';
import { TileInventory } from '@app/plugins/inventory/tile-inventory';
import { SeekerList } from '@app/plugins/seeker-list';
import { ethers } from 'ethers';
import { Vector3 } from 'three';
import { TileAction } from '../tile-action';
import { Model as Box } from './Box';
import { Model as Blockyman } from './Pirate_crew';
import { Model as Tower } from './Unit_tower';
import { WheelIntent } from './Wheel';
import { CogAction } from '@dawnseekers/core';

const TILE_SIZE = 1;

const CONSTRUCT_INTENT = 'construct';
const USE_INTENT = 'use';
const MOVE_INTENT = 'move';
const SCOUT_INTENT = 'scout';

type UIMode = 'popups' | 'wheel' | 'toolbar';
let UI_MODE: UIMode = 'wheel';

export function setMode(m: UIMode) {
    UI_MODE = m;
}

function hash(str: string) {
    let hash = 0;
    for (let i = 0, len = str.length; i < len; i++) {
        const chr = str.charCodeAt(i);
        hash = (hash << 5) - hash + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}

interface TileProps extends ComponentProps {
    tile: WorldTileFragment;
    selectTiles?: Selector<string[]>;
    selectTileForIntent?: Selector<string>;
    selectedTiles?: SelectedTileFragment[];
    selectedSeeker?: SelectedSeekerFragment;
    intent?: string;
    selectIntent?: Selector<string | undefined>;
    color?: string;
    opacity?: number;
}

function getHeightForCoords(tile: WorldTileFragment): number {
    return Math.abs(hash(tile.id) % 5) * 0.1 + 0.2;
}

function getTileXYZ([q, r, _s]: [number, number, number], size = TILE_SIZE): [number, number, number] {
    const x = size * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
    const y = 0;
    const z = size * ((3 / 2) * r);
    return [x, y, z];
}

interface SelectionInfoProps {
    player?: ConnectedPlayer;
    selectedSeeker?: SelectedSeekerFragment;
    selectSeeker: Selector<string | undefined>;
    intent?: string;
    selectedTiles: SelectedTileFragment[];
    influenceTiles: SelectedTileFragment[];
    selectTileForIntent: Selector<string>;
    selectIntent: (intent: string | undefined, tileId?: string) => void;
    canScout: boolean;
    canConstruct: boolean;
    canMove: boolean;
    canUse: boolean;
}
const SelectionInfo: FunctionComponent<SelectionInfoProps> = ({
    selectedTiles,
    influenceTiles,
    selectedSeeker,
    player,
    selectSeeker,
    intent,
    selectIntent,
    canScout,
    canConstruct,
    canMove,
    canUse
    // selectTileForIntent
}) => {
    // const tile: WorldTileFragment | undefined = undefined;
    // const component = (pluginState || [])
    //     .flatMap((p) => p.components)
    //     .filter((c) => c.type === 'building')
    //     .find(() => true);
    // const buildingInfo = tile !== undefined && (
    //     <div style={{ color: 'white', background: '#143063', width: '30rem', padding: '1rem 1rem' }}>
    //         <h3>{component?.title ?? tile?.building?.kind?.name?.value ?? 'Unnamed Building'}</h3>
    //         <span className="sub-title">{component?.summary || ''}</span>
    //         <p>&nbsp;</p>
    //         {component && <TileAction showTitle={false} component={component} className="action" />}
    //     </div>
    // );

    const selectNextSeeker = (n: number) => {
        if (!player) {
            return;
        }
        if (!selectedSeeker) {
            return;
        }
        if (player.seekers.length === 0) {
            return;
        }
        const seekerIndex = player.seekers.map((s) => s.id).indexOf(selectedSeeker.id);
        const nextIndex =
            seekerIndex + n > player.seekers.length - 1
                ? 0
                : seekerIndex + n < 0
                ? player.seekers.length - 1
                : seekerIndex + n;
        selectSeeker(player.seekers[nextIndex].id);
    };

    const activeIntent = !!intent;
    const nearbySeekers =
        influenceTiles.length > 0
            ? influenceTiles.flatMap((t) => t.seekers).filter((s) => !!s && s.id !== selectedSeeker?.id)
            : selectedTiles.flatMap((t) => t.seekers);
    const nearbyBuildingTiles = influenceTiles.length > 0 ? influenceTiles.filter((t) => !!t.building) : [];
    const showTileInfo = !selectedSeeker || activeIntent;
    const showSeekerInfo = !!selectedSeeker;
    const showBagInfo = !intent || intent === CONSTRUCT_INTENT || intent === USE_INTENT;

    const enterBuilding = (tileId: string) => {
        selectIntent(USE_INTENT, tileId);
    };

    const selectedTile = selectedTiles[0]?.id ?? '';
    const tileId = selectedSeeker?.nextLocation?.tile.id !== selectedTile ? selectedTile : '';

    return (
        <div className="selection-actions">
            {showSeekerInfo && (
                <div className="info-box">
                    <div className="action seeker-selector">
                        <img src="/seeker-shield-large.png" className="shield" alt="" />
                        <div className="controls">
                            <button className="icon-button" onClick={() => selectNextSeeker(-1)}>
                                <img src="/icons/prev.png" alt="Previous" />
                            </button>
                            <span className="label">Seeker #0x...{(selectedSeeker?.key ?? '').slice(-5)}</span>
                            <button className="icon-button" onClick={() => selectNextSeeker(+1)}>
                                <img src="/icons/next.png" alt="Next" />
                            </button>
                        </div>
                    </div>
                    <div>Seeker bags</div>
                    <SeekerInventory className="action" seeker={selectedSeeker} />
                </div>
            )}
            {showSeekerInfo && (
                <div className="info-box">
                    <h3>Actions</h3>
                    <ul className="actions">
                        <li>
                            <button
                                className={`action-icon-button ${!intent ? 'active' : ''}`}
                                disabled={!intent}
                                onClick={() => selectIntent(undefined)}
                            >
                                Select
                            </button>
                        </li>
                        <li>
                            <button
                                className={`action-icon-button ${intent === MOVE_INTENT ? 'active' : ''}`}
                                disabled={!canMove || intent === MOVE_INTENT}
                                onClick={() => selectIntent(MOVE_INTENT, tileId)}
                            >
                                Move
                            </button>
                        </li>
                        <li>
                            <button
                                className={`action-icon-button ${intent === SCOUT_INTENT ? 'active' : ''}`}
                                disabled={!canScout || intent === SCOUT_INTENT}
                                onClick={() => selectIntent(SCOUT_INTENT, tileId)}
                            >
                                Scout
                            </button>
                        </li>
                        <li>
                            <button
                                className={`action-icon-button ${intent === CONSTRUCT_INTENT ? 'active' : ''}`}
                                disabled={!canConstruct || intent === CONSTRUCT_INTENT}
                                onClick={() => selectIntent(CONSTRUCT_INTENT, tileId)}
                            >
                                Build
                            </button>
                        </li>
                        <li>
                            <button
                                className={`action-icon-button ${intent === USE_INTENT ? 'active' : ''}`}
                                disabled={!canUse || intent === USE_INTENT}
                                onClick={() => selectIntent(USE_INTENT, tileId)}
                            >
                                Use
                            </button>
                        </li>
                    </ul>
                </div>
            )}
            {showTileInfo && (
                <div className="info-box">
                    <TileInfo showFull={intent === USE_INTENT} />
                </div>
            )}
            {/*{nearbyBuildingTiles.length > 0 && !intent && (*/}
            {/*    <div className="info-box">*/}
            {/*        <div>Nearby buildings</div>*/}
            {/*        {nearbyBuildingTiles.map((t) => (*/}
            {/*            <div key={t.id} style={{ padding: '1rem' }}>*/}
            {/*                {t.building?.kind?.name?.value} {(t.building?.id || '').slice(-8)}{' '}*/}
            {/*                <button style={{ float: 'right' }} onClick={() => enterBuilding(t.id)}>*/}
            {/*                    Use*/}
            {/*                </button>*/}
            {/*            </div>*/}
            {/*        ))}*/}
            {/*    </div>*/}
            {/*)}*/}
            {/*{showBagInfo && influenceTiles.length > 0 && (*/}
            {/*    <div className="info-box">*/}
            {/*        <div>Nearby bags</div>*/}
            {/*        {influenceTiles.map((tile) => (*/}
            {/*            <TileInventory*/}
            {/*                key={`inf-inv-${tile.id}`}*/}
            {/*                className="action"*/}
            {/*                tile={tile}*/}
            {/*                title={`Bags for ${tile.id}`}*/}
            {/*            />*/}
            {/*        ))}*/}
            {/*    </div>*/}
            {/*)}*/}
            {showBagInfo && !intent && selectedTiles.flatMap((t) => t.bags).length > 0 && (
                <div className="info-box">
                    <div>Bags on selected tile</div>
                    {selectedTiles.map((tile) => (
                        <TileInventory
                            key={`sel-inv-${tile.id}`}
                            className="action"
                            tile={tile}
                            title={`Bags for ${tile.id}`}
                        />
                    ))}
                </div>
            )}
            {nearbySeekers.length > 0 && !intent && (
                <div className="info-box">
                    <div>Seekers on selected tile</div>
                    <SeekerList seekers={nearbySeekers} className="action" />
                </div>
            )}
        </div>
    );
};

const Bag: FunctionComponent<TileProps> = ({ tile }) => {
    const ctx = useContext(useInventoryContext);
    // const { isSeekerAtLocation } = useInventory();
    const [selected, setSelected] = useState<boolean>(false);
    const coords = getCoords(tile.coords);
    const height = getHeightForCoords(tile);
    const [x, y, z] = getTileXYZ(coords);
    const handleClick = (e: ThreeEvent<MouseEvent>) => {
        // e.stopPropagation();
        // setSelected((prev) => {
        //     return !prev;
        // });
    };
    const itemCount = tile.bags
        .flatMap((equip) => equip.bag.slots.map((s) => s.balance))
        .reduce((sum, n) => sum + n, 0);
    if (itemCount < 1) {
        return <group />;
    }
    return (
        <group position={[x, y, z]} onClick={handleClick}>
            <Box position={[0.5, height, 0.35]} scale={1} />
            {selected && (
                <Html center position={[0.5, height / 2 + 1.5, 0.35]}>
                    <useInventoryContext.Provider value={ctx}>
                        <div style={{ color: 'white', background: '#143063', padding: '1rem 3rem' }}>
                            <Inventory bags={tile.bags} ownerId={tile.id} isInteractable={true} />
                        </div>
                        <div
                            className="arrow-down"
                            style={{
                                position: 'relative',
                                top: '-1px',
                                left: '44%',
                                width: 0,
                                height: 0,
                                borderLeft: '20px solid transparent',
                                borderRight: '20px solid transparent',
                                borderTop: '20px solid #143063'
                            }}
                        ></div>
                    </useInventoryContext.Provider>
                </Html>
            )}
        </group>
    );
};

interface PlayerSeekerProps extends TileProps {
    seeker: WorldSeekerFragment;
    selectSeeker: Selector<string | undefined>;
    selected: boolean;
    canScout: boolean;
    canConstruct: boolean;
    canUse: boolean;
    canMove: boolean;
}
const PlayerSeeker: FunctionComponent<PlayerSeekerProps> = ({
    tile,
    intent,
    selectSeeker,
    selected,
    seeker,
    canScout,
    canConstruct,
    canUse,
    canMove,
    selectIntent
}) => {
    const ref = useRef() as any;
    const coords = getCoords(tile.coords);
    const height = getHeightForCoords(tile);
    const [x, y, z] = getTileXYZ(coords);
    const color = selected ? '#08ce1e' : '#c51773';

    const handleClick = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        selectSeeker(seeker.id);
    };

    useFrame(() => {
        if (!ref) {
            return;
        }
        const position = ref.current.position.lerp(new Vector3(x, y, z), 0.1);
        ref.current.position.x = position.x;
        ref.current.position.y = position.y;
        ref.current.position.z = position.z;
    });

    const items: WheelIntent[] = (
        intent
            ? [
                  { value: 100, intent: intent.toUpperCase() },
                  { value: 100, intent: 'CANCEL' }
              ]
            : [
                  canMove ? { value: 100, intent: 'MOVE' } : null,
                  canConstruct ? { value: 100, intent: 'CONSTRUCT' } : null,
                  canUse ? { value: 100, intent: 'USE' } : null,
                  canScout ? { value: 100, intent: 'SCOUT' } : null
              ]
    ).filter((x) => !!x) as WheelIntent[];

    const zOffset = tile.building ? 0.5 : 0;

    return (
        <group ref={ref} onClick={handleClick}>
            <Blockyman position={[0, height, zOffset]} rotation-y={0.9} scale={8} color={color} onClick={handleClick} />
            {/*{selected && (*/}
            {/*    <Html*/}
            {/*        position={[0, height + 0.5, zOffset]}*/}
            {/*        style={{ pointerEvents: 'none', left: '-100px', top: '-90px' }}*/}
            {/*    >*/}
            {/*        <Wheel*/}
            {/*            items={items}*/}
            {/*            width={200}*/}
            {/*            height={200}*/}
            {/*            innerRadius={38}*/}
            {/*            outerRadius={65}*/}
            {/*            intent={intent}*/}
            {/*            selectIntent={selectIntent}*/}
            {/*        />*/}
            {/*    </Html>*/}
            {/*)}*/}
        </group>
    );
};

interface OtherSeekerProps extends TileProps {
    seeker: WorldSeekerFragment;
}
const OtherSeeker: FunctionComponent<OtherSeekerProps> = ({ seeker, tile }) => {
    const [selected, setSelected] = useState<boolean>(false);
    const coords = getCoords(tile.coords);
    const height = getHeightForCoords(tile);
    const [x, y, z] = getTileXYZ(coords);
    const handleClick = (e: ThreeEvent<MouseEvent>) => {
        // e.stopPropagation();
        // setSelected((prev) => {
        //     return !prev;
        // });
    };
    return (
        <group position={[x, y, z]} onClick={handleClick}>
            <Blockyman position={[-0.25, height, -0.5]} scale={5} color={'#647591'} onClick={handleClick} />
            {selected && (
                <Html center position={[-0.25, height / 2 + 2.5, 0.25]}>
                    <div>
                        <div style={{ color: 'white', background: '#143063', padding: '1rem 3rem' }}>
                            Seeker #0x{seeker.id.slice(-8)}
                        </div>
                        <div
                            className="arrow-down"
                            style={{
                                position: 'relative',
                                top: '-1px',
                                left: '44%',
                                width: 0,
                                height: 0,
                                borderLeft: '20px solid transparent',
                                borderRight: '20px solid transparent',
                                borderTop: '20px solid #143063'
                            }}
                        ></div>
                    </div>
                </Html>
            )}
        </group>
    );
};

interface BuildingProps {
    tile: WorldTileFragment;
    selectTile: Selector<string | undefined>;
    selectBuilding: Selector<string | undefined>;
    selected: boolean;
    pluginState: PluginState[];
    color: string;
}
const Building: FunctionComponent<BuildingProps> = ({
    selected,
    selectBuilding,
    selectTile,
    color,
    tile,
    pluginState
}) => {
    const coords = getCoords(tile.coords);
    const height = getHeightForCoords(tile);
    const [x, y, z] = getTileXYZ(coords);
    const handleClick = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        selectTile(selected ? undefined : tile.id);
        selectBuilding(selected ? undefined : tile.id);
    };
    const component = (pluginState || [])
        .flatMap((p) => p.components)
        .filter((c) => c.type === 'building')
        .find(() => true);
    return (
        <group position={[x, y, z]} onClick={handleClick}>
            <Tower position={[0, height, 0]} scale={2} color={color} />
            {selected && UI_MODE === 'popups' && (
                <Html center position={[0, height + 2.5, 0]}>
                    <div style={{ color: 'white', background: '#143063', width: '30rem', padding: '1rem 1rem' }}>
                        <h3>{component?.title ?? tile.building?.kind?.name?.value ?? 'Unnamed Building'}</h3>
                        <span className="sub-title">{component?.summary || ''}</span>
                        <p>&nbsp;</p>
                        {component && <TileAction showTitle={false} component={component} className="action" />}
                    </div>
                    <div
                        className="arrow-down"
                        style={{
                            position: 'relative',
                            top: '-1px',
                            left: '44%',
                            width: 0,
                            height: 0,
                            borderLeft: '20px solid transparent',
                            borderRight: '20px solid transparent',
                            borderTop: '20px solid #143063'
                        }}
                    ></div>
                </Html>
            )}
        </group>
    );
};

const Tile: FunctionComponent<TileProps> = ({ selectTileForIntent, tile, selectedSeeker }) => {
    const [hover, setHover] = useState<boolean>(false);
    const onPointerOver = () => setHover(true);
    const onPointerOut = () => setHover(false);
    const [actualHeight, setActualHeight] = useState<number>(0.01);
    const ref = useRef() as any;
    const coords = getCoords(tile.coords);
    const height = tile.biome === BiomeKind.UNDISCOVERED ? 0.01 : getHeightForCoords(tile);
    const [x, y, z] = getTileXYZ(coords);
    const player = usePlayer();

    const click = (e: ThreeEvent<MouseEvent>) => {
        if (!selectTileForIntent) {
            return;
        }
        e.stopPropagation();
        selectTileForIntent(tile.id);
    };

    const handleRightCLick = (e: ThreeEvent<MouseEvent>) => {
        if (!selectTileForIntent || !selectedSeeker) {
            return;
        }
        e.stopPropagation();
        selectTileForIntent(tile.id);

        // dispatch some kind of action here
        if (tile.biome === BiomeKind.DISCOVERED) {
            const [_zone, q, r, s] = tile.coords;
            const action: CogAction = {
                name: 'MOVE_SEEKER',
                args: [selectedSeeker.key, q, r, s]
            };
            player?.dispatch(action);
            return;
        }

        if (tile.biome === BiomeKind.UNDISCOVERED) {
            const [_zone, q, r, s] = tile.coords;
            const action: CogAction = {
                name: 'SCOUT_SEEKER',
                args: [selectedSeeker.key, q, r, s]
            };
            player?.dispatch(action);
            return;
        }
    };

    useFrame(() => {
        if (!ref) {
            return;
        }
        if (Math.abs(actualHeight - height) > 0.05) {
            if (actualHeight < height) {
                setActualHeight(actualHeight + 0.02);
            } else if (actualHeight > height) {
                setActualHeight(actualHeight - 0.02);
            }
        }
    });
    const hoverMultipllier = hover ? 0.41 : 0.4;
    const heightMultiplier = height * 0.15 + hoverMultipllier;
    const color1 =
        tile.biome === BiomeKind.DISCOVERED
            ? chroma('#6e7a94').luminance(heightMultiplier).hex()
            : chroma('#6e7a94').darken(0.25).hex();
    const color2 =
        tile.biome === BiomeKind.DISCOVERED
            ? chroma('#6e7a94').luminance(heightMultiplier).hex()
            : chroma('#6e7a94').darken(0.25).hex();
    return (
        <group
            position={[x, y, z]}
            onClick={click}
            onPointerOver={onPointerOver}
            onPointerOut={onPointerOut}
            onContextMenu={handleRightCLick}
        >
            <Cylinder ref={ref} args={[TILE_SIZE, TILE_SIZE, actualHeight, 6]} position={[0, actualHeight / 2, 0]}>
                <meshPhongMaterial color="#b7cee2">
                    <GradientTexture stops={[0, 1]} colors={[color1, color2]} size={10} />
                </meshPhongMaterial>
                <Edges
                    scale={tile.biome == BiomeKind.DISCOVERED ? 1.01 : 1}
                    threshold={15} // Display edges only when the angle between two faces exceeds this value (default=15 degrees)
                    color={tile.biome == BiomeKind.DISCOVERED ? '#becdde' : '#354a6b'}
                />
            </Cylinder>
        </group>
    );
};

const TileSelection: FunctionComponent<TileProps> = ({ color, opacity, tile }) => {
    const [hover, setHover] = useState<boolean>(false);
    const onPointerOver = () => setHover(true);
    const onPointerOut = () => setHover(false);
    const coords = getCoords(tile.coords);
    const [x, y, z] = getTileXYZ(coords);
    const tileHeight = tile.biome === BiomeKind.UNDISCOVERED ? 0.01 : getHeightForCoords(tile);
    const height = 0.001;
    const size = 0.9;
    const opacityWithDefault = opacity === undefined ? 1 : opacity;
    const opacityWithHover = hover ? Math.min(opacityWithDefault + 0.1, 1) : opacityWithDefault;
    return (
        <group position={[x, y, z]} onPointerOver={onPointerOver} onPointerOut={onPointerOut}>
            <Cylinder args={[size, size, height, 6]} position={[0, tileHeight, 0]}>
                <meshPhongMaterial
                    color={color === undefined ? 'white' : color}
                    opacity={opacityWithHover}
                    transparent={true}
                />
            </Cylinder>
        </group>
    );
};

export interface MapProps extends ComponentProps {}

const StyledMap = styled('div')`
    ${styles}
`;

export const R3FMap: FunctionComponent<MapProps> = ({ ...otherProps }) => {
    const player = usePlayer();
    // const { dispatch } = player || {};
    const { world } = useGameState();
    const {
        selectTiles,
        selectSeeker: rawSelectSeeker,
        tiles: rawSelectedTiles,
        selectIntent: rawSelectIntent,
        intent,
        seeker: selectedSeeker
    } = useSelection();
    const [selectedBuilding, selectBuilding] = useState<string | undefined>(undefined);

    const tiles = world?.tiles || ([] as WorldTileFragment[]);
    const playerSeekers = tiles
        .flatMap((tile) => tile.seekers.map((seeker) => ({ tile, seeker: { ...seeker } })))
        .filter(({ seeker }) => !!(player?.seekers || []).find((s) => s.id === seeker.id));
    const otherSeekers = tiles
        .flatMap((tile) => tile.seekers.map((seeker) => ({ tile, seeker })))
        .filter(({ seeker }) => !playerSeekers.some(({ seeker: playerSeeker }) => playerSeeker.id === seeker.id));
    const bagsWithTile = tiles.flatMap((tile) => tile.bags.map((bag) => ({ tile, bag })));
    const buildingsWithTile = tiles
        .filter((tile) => !!tile.building)
        .map((tile) => ({ tile, building: tile.building as WorldBuildingFragment }));
    const selectedSeekerTile: WorldTileFragment | undefined = selectedSeeker?.nextLocation?.tile
        ? tiles.find((t) => t.id === selectedSeeker.nextLocation?.tile?.id)
        : undefined;

    const moveableFromTile =
        (rawSelectedTiles || [])
            .filter((t) => t.biome === BiomeKind.DISCOVERED)
            .slice(-1)
            .find(() => true) || selectedSeeker?.nextLocation?.tile;

    const moveableTiles = moveableFromTile
        ? getNeighbours(tiles, moveableFromTile).filter(
              (t): t is WorldTileFragment => !!t && t.biome === BiomeKind.DISCOVERED
          )
        : [];

    const scoutableTiles = selectedSeeker?.nextLocation?.tile
        ? getNeighbours(tiles, selectedSeeker.nextLocation.tile).filter(
              (t): t is WorldTileFragment => !!t && t.biome === BiomeKind.UNDISCOVERED
          )
        : [];

    const constructableTiles = selectedSeeker?.nextLocation?.tile
        ? getNeighbours(tiles, selectedSeeker.nextLocation.tile).filter(
              (t): t is WorldTileFragment => !!t && t.biome === BiomeKind.DISCOVERED && !t.building
          )
        : [];

    const useableTiles = selectedSeekerTile
        ? getNeighbours(tiles, selectedSeekerTile)
              .concat([selectedSeekerTile])
              .filter((t): t is WorldTileFragment => !!t && t.biome === BiomeKind.DISCOVERED && !!t.building)
        : [];

    const influenceTiles = selectedSeekerTile
        ? getNeighbours(tiles, selectedSeekerTile).concat([selectedSeekerTile])
        : [];

    const selectedTiles = (rawSelectedTiles || []).filter((t, idx) => {
        if (intent == MOVE_INTENT) {
            return true; // TODO: do better
        } else if (intent == SCOUT_INTENT) {
            return !!scoutableTiles.find(({ id }) => id === t.id);
        } else if (intent == CONSTRUCT_INTENT) {
            return !!constructableTiles.find(({ id }) => id === t.id);
        } else if (intent == USE_INTENT) {
            return !!useableTiles.find(({ id }) => id === t.id);
        } else {
            return idx === 0;
        }
    });

    const selectTileForIntent = (tileId: string | undefined) => {
        let ids: string[] = [];
        if (intent == MOVE_INTENT && tileId != undefined) {
            // move tiles are additive
            const prevIds = selectedTiles.map((t) => t.id);
            if (prevIds.some((id) => id == tileId)) {
                return;
            } else if (!moveableTiles.find((t) => t.id == tileId)) {
                rawSelectIntent(undefined);
                selectSeeker(undefined);
                selectTiles(tileId ? [tileId] : undefined);
                return;
            } else {
                ids = [...prevIds, tileId];
            }
        } else if (intent == SCOUT_INTENT && tileId != undefined) {
            // scout tiles are multi select with toggle on/off
            if (!scoutableTiles.find((t) => t.id == tileId)) {
                rawSelectIntent(undefined);
                selectSeeker(undefined);
                selectTiles([tileId]);
                return;
            }
            const prevIds = selectedTiles.map(({ id }) => id);
            if (prevIds.some((id) => id === tileId)) {
                ids = prevIds.filter((id) => id !== tileId);
            } else {
                ids = [...prevIds, tileId];
            }
        } else if (intent == CONSTRUCT_INTENT && tileId != undefined) {
            // construct is single tile select, no toggle
            if (!constructableTiles.find((t) => t.id == tileId)) {
                rawSelectIntent(undefined);
                selectSeeker(undefined);
                selectTiles([tileId]);
                return;
            }
            ids = [tileId];
        } else if (intent == USE_INTENT && tileId != undefined) {
            // use is single tile select, no toggle
            if (!useableTiles.find((t) => t.id == tileId)) {
                rawSelectIntent(undefined);
                selectSeeker(undefined);
                selectTiles([tileId]);
                return;
            }
            ids = [tileId];
        } else if (tileId != undefined) {
            // selecting a nearby tile or deselect the seeker
            if (!influenceTiles.find((t) => t.id == tileId)) {
                selectSeeker(undefined);
            }
            const prevIds = selectedTiles.map((id) => id);
            if (prevIds.some(({ id }) => id === tileId)) {
                ids = [];
            } else {
                ids = tileId ? [tileId] : [];
            }
            ids = [tileId];
        } else {
            // clicked in the void / not on a tile
            selectSeeker(undefined);
            ids = [];
        }
        // } else {
        //     // default is single tile, with toggle
        //     // but it will swipe out any existing seeker selection
        //     selectSeeker(undefined);
        //     const prevIds = selectedTiles.map((id) => id);
        //     if (prevIds.some(({ id }) => id === tileId)) {
        //         ids = [];
        //     } else {
        //         ids = tileId ? [tileId] : [];
        //     }
        // }
        selectTiles(ids);
    };

    const selectIntent = (intent: string | undefined, tileId?: string) => {
        selectTiles(tileId ? [tileId] : []);
        rawSelectIntent(intent);
        selectBuilding(undefined);
    };

    const selectedTileInInfluence = influenceTiles.some((t) => t.id === selectedTiles[0]?.id);
    const selectionColor =
        intent == CONSTRUCT_INTENT
            ? '#ff8c16'
            : intent == MOVE_INTENT
            ? '#5ba067'
            : intent == SCOUT_INTENT
            ? '#c51773'
            : intent == USE_INTENT
            ? '#3a759d'
            : selectedTileInInfluence
            ? '#aeffb7'
            : '#3a759d';

    const inventoryContext = useContext(useInventoryContext);
    const pluginState = usePluginState();

    const selectSeeker = (id: string | undefined) => {
        // selectSeeker should:
        // ...cancel any existing intent
        // ...select the tile
        // ...select the seeker
        // or deselect everything if already selected
        selectIntent(undefined);
        rawSelectSeeker(id);
    };

    return (
        <StyledMap {...otherProps}>
            <Canvas onPointerMissed={() => selectTileForIntent(undefined)}>
                <useInventoryContext.Provider value={inventoryContext}>
                    <Suspense fallback={null}>
                        <MapControls
                            makeDefault
                            minAzimuthAngle={-Math.PI / 4}
                            maxAzimuthAngle={Math.PI / 4}
                            minPolarAngle={Math.PI / 16}
                            maxPolarAngle={Math.PI - Math.PI / 1.8}
                        />
                        <ambientLight color="#ffffff" intensity={0.55} />
                        <directionalLight color="#fff" position={[100, 100, 100]} />
                        <OrthographicCamera
                            makeDefault
                            zoom={80}
                            top={100}
                            bottom={-100}
                            left={100}
                            right={-100}
                            near={1}
                            far={1000}
                            position={[10, 100, 100]}
                        />
                        {tiles.map((tile) => (
                            <Tile
                                key={tile.id}
                                tile={tile}
                                selectTileForIntent={selectTileForIntent}
                                selectedTiles={selectedTiles}
                                opacity={1}
                                selectedSeeker={selectedSeeker}
                            />
                        ))}
                        {bagsWithTile.map(({ tile, bag }) => (
                            <Bag key={bag.id} tile={tile} />
                        ))}
                        {otherSeekers.map(({ tile, seeker }) => (
                            <OtherSeeker key={seeker.id} tile={tile} seeker={seeker} />
                        ))}
                        {playerSeekers.map(({ tile, seeker }) => (
                            <PlayerSeeker
                                key={seeker.id}
                                tile={tile}
                                selectIntent={selectIntent}
                                intent={intent}
                                selectSeeker={() => {
                                    selectSeeker(seeker.id);
                                    selectTiles([tile.id]);
                                }}
                                seeker={seeker}
                                selected={seeker.id === selectedSeeker?.id}
                                canScout={scoutableTiles.length > 0}
                                canMove={true}
                                canConstruct={constructableTiles.length > 0}
                                canUse={useableTiles.length > 0}
                            />
                        ))}
                        {buildingsWithTile.map(({ tile, building }) => (
                            <Building
                                key={building.id}
                                pluginState={pluginState || []}
                                tile={tile}
                                color={
                                    intent === USE_INTENT && selectedTiles.some((t) => t.id == tile.id)
                                        ? '#3a759d'
                                        : '#7a8db0'
                                }
                                selectTile={selectTileForIntent}
                                selectBuilding={selectBuilding}
                                selected={intent === USE_INTENT && selectedTiles.some((t) => t.id == tile.id)}
                            />
                        ))}
                        {intent === SCOUT_INTENT &&
                            scoutableTiles.map((tile) => (
                                <TileSelection key={`scoutable-${tile.id}`} tile={tile} color="#c51773" opacity={0.5} />
                            ))}
                        {intent === MOVE_INTENT &&
                            moveableTiles.map((tile) => (
                                <TileSelection key={`moveable-${tile.id}`} tile={tile} color="green" opacity={0.3} />
                            ))}
                        {intent === CONSTRUCT_INTENT &&
                            constructableTiles.map((tile) => (
                                <TileSelection key={`construct-${tile.id}`} tile={tile} color="#ff8c16" opacity={0.5} />
                            ))}
                        {intent === USE_INTENT &&
                            useableTiles.map((tile) => (
                                <TileSelection key={`use-${tile.id}`} tile={tile} color="#3a759d" opacity={0.5} />
                            ))}
                        {(selectedTiles || []).map((tile) => (
                            <group key={`selected-${tile.id}`}>
                                <TileSelection tile={tile} color={selectionColor} opacity={intent ? 1 : 1} />
                                {intent === CONSTRUCT_INTENT && (
                                    <Building
                                        pluginState={[]}
                                        tile={tile}
                                        color="#ff8c16"
                                        selectTile={selectTileForIntent}
                                        selectBuilding={selectBuilding}
                                        selected={selectedBuilding === tile.id}
                                    />
                                )}
                            </group>
                        ))}
                        {selectedSeeker &&
                            !intent &&
                            influenceTiles.map((tile) => (
                                <TileSelection
                                    key={`influence-${tile.id}`}
                                    tile={tile}
                                    color={'#5fff71'}
                                    opacity={0.3}
                                />
                            ))}
                    </Suspense>
                </useInventoryContext.Provider>
            </Canvas>
            <SelectionInfo
                player={player}
                selectSeeker={selectSeeker}
                selectTileForIntent={selectTileForIntent}
                selectIntent={selectIntent}
                influenceTiles={influenceTiles}
                selectedTiles={selectedTiles}
                selectedSeeker={selectedSeeker}
                intent={intent}
                canScout={scoutableTiles.length > 0}
                canMove={moveableTiles.length > 0}
                canConstruct={constructableTiles.length > 0}
                canUse={useableTiles.length > 0}
            />
        </StyledMap>
    );
};

function getCoords(coords: any[]): [number, number, number] {
    return [
        Number(ethers.fromTwos(coords[1], 16)),
        Number(ethers.fromTwos(coords[2], 16)),
        Number(ethers.fromTwos(coords[3], 16))
    ];
}

function getTileByQRS(tiles: WorldTileFragment[], q: number, r: number, s: number): WorldTileFragment | undefined {
    const coords = [0, q, r, s];
    return tiles.find((t) => t.coords.every((n, idx) => coords[idx] == Number(ethers.fromTwos(n, 16))));
}

function getNeighbours(tiles: WorldTileFragment[], t: Pick<WorldTileFragment, 'coords'>): WorldTileFragment[] {
    const [q, r, s] = getCoords(t.coords);
    return [
        getTileByQRS(tiles, q + 1, r, s - 1),
        getTileByQRS(tiles, q + 1, r - 1, s),
        getTileByQRS(tiles, q, r - 1, s + 1),
        getTileByQRS(tiles, q - 1, r, s + 1),
        getTileByQRS(tiles, q - 1, r + 1, s),
        getTileByQRS(tiles, q, r + 1, s - 1)
    ].filter((t): t is WorldTileFragment => !!t);
}

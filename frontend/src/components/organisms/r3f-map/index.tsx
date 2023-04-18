import { ComponentProps } from '@app/types/component-props';
import { Cylinder, Edges, GradientTexture, Html, MapControls, OrthographicCamera } from '@react-three/drei';
import { Canvas, ThreeEvent, useFrame } from '@react-three/fiber';
import { FunctionComponent, Suspense, useContext, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { styles } from './styles';
// import { Model as Blockyman } from './Blockyman';
import {
    BiomeKind,
    PluginState,
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
import { Inventory } from '@app/plugins/inventory';
import { useInventoryContext } from '@app/plugins/inventory/inventory-provider';
import { ethers } from 'ethers';
import { Color, ShaderMaterial, Vector3 } from 'three';
import { TileAction } from '../tile-action';
import { Model as Box } from './Box';
import { Model as Blockyman } from './Pirate_crew';
import { Model as Tower } from './Unit_tower';
import { Wheel } from './Wheel';

const TILE_SIZE = 1;

const CONSTRUCT_INTENT = 'construct';
const MOVE_INTENT = 'move';
const SCOUT_INTENT = 'scout';

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
    intent?: string;
    selectIntent?: Selector<string | undefined>;
    color?: string;
    opacity?: number;
}

function getHeightForCoords(tile: WorldTileFragment): number {
    return Math.abs(hash(tile.id) % 5) * 0.1 + 0.1;
}

function getTileXYZ([q, r, _s]: [number, number, number], size = TILE_SIZE): [number, number, number] {
    const x = size * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
    const y = 0;
    const z = size * ((3 / 2) * r);
    return [x, y, z];
}

const Bag: FunctionComponent<TileProps> = ({ tile }) => {
    const ctx = useContext(useInventoryContext);
    // const { isSeekerAtLocation } = useInventory();
    const [selected, setSelected] = useState<boolean>(false);
    const coords = getCoords(tile.coords);
    const height = getHeightForCoords(tile);
    const [x, y, z] = getTileXYZ(coords);
    const handleClick = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        setSelected((prev) => {
            return !prev;
        });
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
}
const PlayerSeeker: FunctionComponent<PlayerSeekerProps> = ({
    tile,
    intent,
    selectSeeker,
    selected,
    seeker,
    selectIntent,
    selectTiles
}) => {
    const ref = useRef() as any;
    const coords = getCoords(tile.coords);
    const height = getHeightForCoords(tile);
    const [x, y, z] = getTileXYZ(coords);
    const color = '#c51773';

    const handleClick = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        selectSeeker(selected ? undefined : seeker.id);
        console.log(selected);
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

    return (
        <group ref={ref} onClick={handleClick}>
            <Blockyman position={[0, height, 0]} scale={6} color={color} onClick={handleClick} />
            {selected && (
                <Html position={[0, height + 0.5, 0]} style={{ pointerEvents: 'none', left: '-100px', top: '-90px' }}>
                    <Wheel
                        width={200}
                        height={200}
                        innerRadius={50}
                        outerRadius={75}
                        intent={intent}
                        selectIntent={selectIntent}
                        selectTiles={selectTiles}
                    />
                </Html>
            )}
        </group>
    );
};

const OtherSeeker: FunctionComponent<TileProps> = ({ tile }) => {
    const coords = getCoords(tile.coords);
    const height = getHeightForCoords(tile);
    const [x, y, z] = getTileXYZ(coords);
    return (
        <group position={[x, y, z]}>
            <Blockyman position={[-0.25, height, -0.5]} scale={4} color={'#647591'} />
        </group>
    );
};

interface BuildingProps {
    tile: WorldTileFragment;
    pluginState: PluginState[];
}
const Building: FunctionComponent<BuildingProps> = ({ tile, pluginState }) => {
    const [selected, setSelected] = useState<boolean>(false);
    const coords = getCoords(tile.coords);
    const height = getHeightForCoords(tile);
    const [x, y, z] = getTileXYZ(coords);
    const handleClick = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        setSelected((prev) => {
            return !prev;
        });
    };
    const component = (pluginState || [])
        .flatMap((p) => p.components)
        .filter((c) => c.type === 'building')
        .find(() => true);
    return (
        <group position={[x, y, z]} onClick={handleClick}>
            <Tower position={[-0.5, height, 0.35]} scale={1} />
            {selected && (
                <Html center position={[-0.5, height + 2.5, 0.35]}>
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

const Tile: FunctionComponent<TileProps> = ({ selectTileForIntent, tile }) => {
    const [actualHeight, setActualHeight] = useState<number>(0.01);
    const ref = useRef() as any;
    const coords = getCoords(tile.coords);
    const height = tile.biome === BiomeKind.UNDISCOVERED ? 0.01 : getHeightForCoords(tile);
    const [x, y, z] = getTileXYZ(coords);
    const click = (e: ThreeEvent<MouseEvent>) => {
        if (!selectTileForIntent) {
            return;
        }
        e.stopPropagation();
        selectTileForIntent(tile.id);
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
    const color1 = tile.biome === BiomeKind.DISCOVERED ? '#d0d8ed' : '#6e7a94';
    const color2 = tile.biome === BiomeKind.DISCOVERED ? '#adb6cb' : '#6e7a94';
    const opacity = tile.biome === BiomeKind.DISCOVERED ? 1 : 1;
    return (
        <group position={[x, y, z]} onClick={click}>
            <Cylinder ref={ref} args={[TILE_SIZE, TILE_SIZE, actualHeight, 6]} position={[0, actualHeight / 2, 0]}>
                <meshPhongMaterial color="#b7cee2" transparent opacity={opacity}>
                    <GradientTexture stops={[0, 1]} colors={[color1, color2]} size={10} />
                </meshPhongMaterial>
                <Edges
                    scale={1.01}
                    threshold={15} // Display edges only when the angle between two faces exceeds this value (default=15 degrees)
                    color="#becdde"
                />
            </Cylinder>
        </group>
    );
};

const TileSelection: FunctionComponent<TileProps> = ({ color, opacity, tile }) => {
    const [hover, setHover] = useState<boolean>(false);
    const coords = getCoords(tile.coords);
    const [x, y, z] = getTileXYZ(coords);
    const tileHeight = tile.biome === BiomeKind.UNDISCOVERED ? 0.01 : getHeightForCoords(tile);
    const height = 0.1;
    const size = 0.9;
    const opacityWithDefault = opacity === undefined ? 1 : opacity;
    const opacityWithHover = hover ? Math.min(opacityWithDefault + 0.1, 1) : opacityWithDefault;
    const onPointerOver = () => setHover(true);
    const onPointerOut = () => setHover(false);
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
        selectSeeker,
        tiles: rawSelectedTiles,
        selectIntent: rawSelectIntent,
        intent,
        seeker: selectedSeeker
    } = useSelection();

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

    const scoutableTiles =
        selectedSeeker?.nextLocation?.tile && intent == SCOUT_INTENT
            ? getNeighbours(tiles, selectedSeeker.nextLocation.tile).filter(
                  (t): t is WorldTileFragment => !!t && t.biome === BiomeKind.UNDISCOVERED
              )
            : [];

    const moveableFromLocation =
        (rawSelectedTiles || [])
            .filter((t) => t.biome === BiomeKind.DISCOVERED)
            .slice(-1)
            .find(() => true) || selectedSeeker?.nextLocation?.tile;
    const moveableTiles =
        moveableFromLocation && intent == MOVE_INTENT
            ? getNeighbours(tiles, moveableFromLocation).filter(
                  (t): t is WorldTileFragment => !!t && t.biome === BiomeKind.DISCOVERED
              )
            : [];

    const constructableTiles =
        selectedSeeker?.nextLocation?.tile && intent == CONSTRUCT_INTENT
            ? getNeighbours(tiles, selectedSeeker.nextLocation.tile).filter(
                  (t): t is WorldTileFragment => !!t && t.biome === BiomeKind.DISCOVERED && !t.building
              )
            : [];

    const selectedTiles = (rawSelectedTiles || []).filter((t, idx) => {
        if (intent == MOVE_INTENT) {
            return true; // TODO: do better
        } else if (intent == SCOUT_INTENT) {
            return !!scoutableTiles.find(({ id }) => id === t.id);
        } else if (intent == CONSTRUCT_INTENT) {
            return !!constructableTiles.find(({ id }) => id === t.id);
        } else {
            return idx === 0;
        }
    });

    const selectTileForIntent = (tileId: string) => {
        let ids: string[] = [];
        if (intent == MOVE_INTENT) {
            // move tiles are additive
            const prevIds = selectedTiles.map((t) => t.id);
            if (prevIds.some((id) => id == tileId)) {
                return;
            } else if (!moveableTiles.find((t) => t.id == tileId)) {
                rawSelectIntent(undefined);
                selectTiles([tileId]);
                return;
            } else {
                ids = [...prevIds, tileId];
            }
        } else if (intent == SCOUT_INTENT) {
            // scout tiles are multi select with toggle on/off
            if (!scoutableTiles.find((t) => t.id == tileId)) {
                rawSelectIntent(undefined);
                selectTiles([tileId]);
                return;
            }
            const prevIds = selectedTiles.map(({ id }) => id);
            if (prevIds.some((id) => id === tileId)) {
                ids = prevIds.filter((id) => id !== tileId);
            } else {
                ids = [...prevIds, tileId];
            }
        } else if (intent == CONSTRUCT_INTENT) {
            // construct is single tile select, no toggle
            if (!constructableTiles.find((t) => t.id == tileId)) {
                rawSelectIntent(undefined);
                selectTiles([tileId]);
                return;
            }
            ids = [tileId];
        } else {
            // default is single tile, with toggle
            // TODO: maybe just don't allow selection without intent
            const prevIds = selectedTiles.map((id) => id);
            if (prevIds.some(({ id }) => id === tileId)) {
                ids = [];
            } else {
                ids = [tileId];
            }
        }
        selectTiles(ids);
    };

    const selectIntent = (intent: string | undefined) => {
        selectTiles([]);
        rawSelectIntent(intent);
    };

    const selectionColor =
        intent == CONSTRUCT_INTENT
            ? '#ff8c16'
            : intent == MOVE_INTENT
            ? '#5ba067'
            : intent == SCOUT_INTENT
            ? '#c51773'
            : '#5575a0';

    const inventoryContext = useContext(useInventoryContext);
    const pluginState = usePluginState();

    return (
        <StyledMap {...otherProps}>
            <Canvas>
                <useInventoryContext.Provider value={inventoryContext}>
                    <Suspense fallback={null}>
                        <MapControls
                            makeDefault
                            minAzimuthAngle={-Math.PI / 4}
                            maxAzimuthAngle={Math.PI / 4}
                            minPolarAngle={Math.PI / 16}
                            maxPolarAngle={Math.PI - Math.PI / 1.8}
                        />
                        <ambientLight color="#ffffff" intensity={0.75} />
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
                                selectTiles={selectTiles}
                                selectTileForIntent={selectTileForIntent}
                                selectedTiles={selectedTiles}
                                opacity={1}
                            />
                        ))}
                        {bagsWithTile.map(({ tile, bag }) => (
                            <Bag key={bag.id} tile={tile} />
                        ))}
                        {otherSeekers.map(({ tile, seeker }) => (
                            <OtherSeeker key={seeker.id} tile={tile} />
                        ))}
                        {playerSeekers.map(({ tile, seeker }) => (
                            <PlayerSeeker
                                key={seeker.id}
                                tile={tile}
                                selectIntent={selectIntent}
                                intent={intent}
                                selectTiles={selectTiles}
                                selectSeeker={selectSeeker}
                                seeker={seeker}
                                selected={seeker.id === selectedSeeker?.id}
                            />
                        ))}
                        {buildingsWithTile.map(({ tile, building }) => (
                            <Building key={building.id} pluginState={pluginState || []} tile={tile} />
                        ))}
                        {scoutableTiles.map((tile) => (
                            <TileSelection key={`scoutable-${tile.id}`} tile={tile} color="#c51773" opacity={0.5} />
                        ))}
                        {moveableTiles.map((tile) => (
                            <TileSelection key={`moveable-${tile.id}`} tile={tile} color="green" opacity={0.3} />
                        ))}
                        {constructableTiles.map((tile) => (
                            <TileSelection key={`construct-${tile.id}`} tile={tile} color="#ff8c16" opacity={0.5} />
                        ))}
                        {(selectedTiles || []).map((tile) => (
                            <TileSelection
                                key={`selected-${tile.id}`}
                                tile={tile}
                                color={selectionColor}
                                opacity={intent ? 1 : 1}
                            />
                        ))}
                    </Suspense>
                </useInventoryContext.Provider>
            </Canvas>
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

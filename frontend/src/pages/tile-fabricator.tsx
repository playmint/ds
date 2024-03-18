/** @format */

import { FunctionComponent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';

import { useConfig } from '@app/hooks/use-config';
import { GameStateProvider, useBuildingKinds, useGameState } from '@app/hooks/use-game-state';
import { useThrottle } from '@app/hooks/use-throttle';
import { UnityMapProvider, useUnityMap } from '@app/hooks/use-unity-map';
import {
    BuildingCategoryEnumVals,
    BuildingKind as BuildingKindManifest,
    Building as BuildingManifest,
    FacingDirectionTypes,
    Manifest,
    Tile as TileManifest,
    parseManifestDocuments,
} from '@downstream/cli/utils/manifest';
import {
    BiomeKind,
    CompoundKeyEncoder,
    FacingDirectionKind,
    NodeSelectors,
    WorldBuildingFragment,
    WorldTileFragment,
    getCoords,
} from '@downstream/core';
import { Html, Instance, Instances, MapControls, OrthographicCamera, useFBX } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { ethers, id as keccak256UTF8, solidityPacked } from 'ethers';
import { button, useControls } from 'leva';
import YAML from 'yaml';
import * as THREE from 'three';
import { GroundPlane } from '@app/components/map/GroundPlane';
import { Tiles } from '@app/components/map/Tile';
import { Buildings } from '@app/components/map/Buildings';

const TILE_SIZE = 1;

// ------------

function getTileXYZ([q, r]: [number, number, number], size = TILE_SIZE): [number, number, number] {
    const x = size * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
    const y = 0;
    const z = size * ((3 / 2) * r);
    return [x, y, -z];
}

type ManifestMap = Map<string, z.infer<typeof Manifest>[]>; // map of locationid => Manifests
type BuildingKindMap = Map<string, z.infer<typeof BuildingKindManifest>>; // map of building kinds name => spec
type GridTile = {
    id: string;
    location: [number, number, number]; // in game coords
    position: [number, number, number]; // instance position
};

// ------------

const Building = ({
    model,
    position,
    name,
    showLabels,
}: {
    model: string;
    position: [number, number, number];
    name: string;
    showLabels: boolean;
}) => {
    const fbx = useFBX(model);

    const m = useMemo(() => {
        const material = new THREE.MeshPhongMaterial({ color: new THREE.Color('#fff') });
        const m = fbx.clone(true);
        m.children.forEach((mesh: any) => {
            mesh.material = material;
        });
        return m;
    }, [fbx]);

    if (!m) {
        return <></>;
    }

    return (
        <group position={position}>
            {showLabels && (
                <Html
                    center
                    style={{
                        width: '80px',
                        background: '#111',
                        color: '#eee',
                        textAlign: 'center',
                        fontSize: '10px',
                        pointerEvents: 'none',
                    }}
                    position={[0, 1, 0]}
                >
                    {name}
                </Html>
            )}
            <mesh>
                <primitive object={m} scale={0.02} />
            </mesh>
        </group>
    );
};

interface GridProps {
    tiles: GridTile[];
    onPaintTile: (t: GridTile) => void;
    manifests: ManifestMap;
}

const Grid = ({ tiles, onPaintTile, manifests }: GridProps) => {
    const instances = useMemo(() => {
        return tiles.map((t, i) => {
            const manifest = manifests.get(t.id) || [];
            const isDiscovered = manifest.length != 0;
            let lastPaint = 0;
            const paint = () => {
                if (Date.now() - lastPaint < 100) {
                    return;
                }
                lastPaint = Date.now();
                onPaintTile(t);
            };
            return (
                <Instance
                    key={`${i + 1}`}
                    scale={1}
                    onClick={paint}
                    onPointerEnter={paint}
                    onPointerMove={paint}
                    onPointerOver={paint}
                    position={t.position}
                    color={isDiscovered ? '#253d5d' : '#3f69a0'}
                />
            );
        });
    }, [tiles, manifests, onPaintTile]);

    const debouncedInstances = useThrottle(instances, 40);

    return (
        <Instances limit={10000} range={10000}>
            <cylinderGeometry args={[TILE_SIZE - 0.05, TILE_SIZE - 0.05, 0.01, 6]} />
            <meshBasicMaterial />
            {debouncedInstances}
        </Instances>
    );
};

// -------------------

const toStringDefaults = { indentSeq: false };

const toYAML = (o: any): string => {
    const doc = new YAML.Document(o, { toStringDefaults });
    const specField: any = doc.get('spec');
    if (specField) {
        const locField: any = specField.get('location');
        if (locField) {
            locField.flow = true; // always inline coords
        }
    }
    return doc.toString();
};

// ------------

export interface PageProps {}

const TileFab: FunctionComponent<PageProps> = ({}: PageProps) => {
    const fileRef = useRef<any>();
    const [manifestsz, setManifests] = useState<ManifestMap>(new Map());
    const manifests = useThrottle(manifestsz, 15);
    const [mouseDown, setMouseDown] = useState(false);
    const [buildingKinds, setBuildingKinds] = useState<BuildingKindMap>(new Map());
    const [stateLoaded, setStateLoaded] = useState(false);
    const { ready: mapReady } = useUnityMap();
    const state = useGameState();
    const existingKinds = useBuildingKinds();
    const diameter = 40;

    const [{ brush, facing, labels }] = useControls(
        'Tiles',
        () => {
            return {
                brush: {
                    options: ['DISCOVERED TILE', 'UNDISCOVERED TILE'].concat(
                        Array.from(buildingKinds.values())
                            .map(({ spec }) => spec.name)
                            .sort()
                    ),
                },
                facing: { options: ['RIGHT', 'LEFT'] },
                labels: false,
            };
        },
        [buildingKinds, Array.from(buildingKinds.values()).length]
    );

    const grid = useMemo(() => {
        const tiles: GridTile[] = [];
        for (let q = -diameter; q <= diameter; q++) {
            for (let r = -diameter; r <= diameter; r++) {
                for (let s = -diameter; s <= diameter; s++) {
                    if (q + r + s !== 0) {
                        continue;
                    }
                    const location: [number, number, number] = [q, r, s];
                    tiles.push({
                        id: location.join(':'),
                        location,
                        position: getTileXYZ(location),
                    });
                }
            }
        }
        return tiles;
    }, [diameter]);

    const getManifestDownloadURL = useCallback((): string => {
        const exportable = Array.from(manifests.values())
            .flatMap((v) => v)
            .filter((m) => m.kind === 'Tile' || m.kind === 'Building');
        const data = `${exportable.length > 0 ? '\n---\n' : ''}${exportable.map(toYAML).join('\n---\n')}`;
        const blob = new Blob([data], { type: 'application/x-yaml' });
        return URL.createObjectURL(blob);
    }, [manifests]);

    const { preview } = useControls('View', {
        preview: false,
    });

    const [{}, setManifestControl] = useControls(
        'Mannifests',
        () => ({
            stats: { editable: false, value: '' },
            Reset: button(() => window.location.reload()),
            Clear: button(() => setManifests(new Map())),
            Import: button(() => fileRef.current.click()),
            Export: button(() => window.location.replace(getManifestDownloadURL())),
        }),
        [getManifestDownloadURL]
    );

    useEffect(() => {
        if (stateLoaded) {
            return;
        }
        if (!state?.tiles) {
            return;
        }
        if (!state.world) {
            return;
        }
        if (!existingKinds) {
            return;
        }
        let manifests: ManifestMap = new Map();
        (state.world?.buildings || []).forEach((b) => {
            if (!b.location) {
                return;
            }
            if (!b.kind?.name?.value) {
                return;
            }
            const { q, r, s } = getCoords(b.location.tile);
            const m: z.infer<typeof BuildingManifest> = {
                kind: 'Building',
                spec: {
                    name: b.kind.name.value,
                    location: [q, r, s],
                    facingDirection: b.facingDirection === FacingDirectionKind.RIGHT ? 'RIGHT' : 'LEFT',
                },
            };
            const tile: z.infer<typeof TileManifest> = {
                kind: 'Tile',
                spec: {
                    biome: 'DISCOVERED',
                    location: m.spec.location,
                },
            };
            const id = m.spec.location.join(':');
            manifests = new Map(manifests.set(id, [tile, m]));
        });
        state.tiles.forEach((t) => {
            const { q, r, s } = getCoords(t);
            const m: z.infer<typeof TileManifest> = {
                kind: 'Tile',
                spec: {
                    biome: 'DISCOVERED',
                    location: [q, r, s],
                },
            };
            const id = m.spec.location.join(':');
            if (manifests.has(id)) {
                return;
            }
            manifests = new Map(manifests.set(id, [m]));
        });
        let kinds: BuildingKindMap = new Map();
        existingKinds.forEach((k) => {
            const categoryIndex = parseInt('0x' + k.id.slice(-2));
            const categoryString = BuildingCategoryEnumVals[categoryIndex];
            if (!categoryString || categoryString === 'none') {
                return;
            }
            const m: z.infer<typeof BuildingKindManifest> = {
                kind: 'BuildingKind',
                spec: {
                    id: k.id,
                    name: k.name?.value || 'unknown',
                    category: categoryString,
                    model: (k.model?.value || '') as any,
                    materials: [] as any,
                    inputs: [],
                    outputs: [],
                } as any, // FIXME: remove any
            };
            kinds = new Map(kinds.set(m.spec.name, m));
        });
        setManifests(manifests);
        setBuildingKinds(kinds);
        setStateLoaded(true);
    }, [state.tiles, state.world, existingKinds, stateLoaded]);

    useEffect(() => {
        setManifestControl({ stats: `Tile count: ${Array.from(manifests.values()).length}` });
    }, [manifests, setManifestControl]);

    const onPaintTile = useCallback(
        (t: GridTile) => {
            if (!mouseDown) {
                return;
            }
            const existingManifests = manifests.get(t.id);
            const tile: z.infer<typeof Manifest> = {
                kind: 'Tile',
                spec: {
                    biome: 'DISCOVERED',
                    location: t.location,
                },
            };
            const newManifestsForTile: z.infer<typeof Manifest>[] | undefined = (() => {
                if (brush === 'DISCOVERED TILE') {
                    return existingManifests && existingManifests.length === 1 ? undefined : [tile];
                } else if (brush === 'UNDISCOVERED TILE') {
                    return !existingManifests || existingManifests.length === 0 ? undefined : [];
                } else {
                    const buildingKind = buildingKinds.get(brush);
                    if (!buildingKind) {
                        console.error(`no building kind for brush=${brush}`);
                        return [];
                    }
                    return [
                        tile,
                        {
                            kind: 'Building',
                            spec: {
                                name: buildingKind.spec.name,
                                location: t.location,
                                facingDirection: facing as (typeof FacingDirectionTypes)[number],
                            },
                        },
                    ];
                }
            })();
            if (typeof newManifestsForTile !== 'undefined') {
                setManifests((prev) => new Map(prev.set(t.id, newManifestsForTile)));
            }
        },
        [mouseDown, brush, facing, buildingKinds, manifests]
    );

    const onLoadManifests = useCallback(() => {
        const files = fileRef.current.files;
        const uploads: z.infer<typeof Manifest>[] = [];
        for (let i = 0; i < files.length; i++) {
            if (!/ya?ml$/.test(files[i].name)) {
                continue;
            }
            uploads.push(
                files[i]
                    .text()
                    .then((txt: string) => parseManifestDocuments(txt, files[i].name))
                    .then((docs: any[]) => docs.flatMap((doc) => doc.manifest))
            );
        }
        Promise.all(uploads)
            .then((upload) => upload.flatMap((manifests) => manifests))
            .then((importedManifests) => {
                // merge imported into scene
                setManifests((manifests) => {
                    importedManifests.forEach((m) => {
                        if (m.kind === 'Tile') {
                            const id = m.spec.location.join(':');
                            const existing = manifests.get(id);
                            if (existing && existing.length > 0) {
                                // tile already exists, don't overrite
                            } else {
                                manifests = new Map(manifests.set(id, [m]));
                            }
                        } else if (m.kind === 'Building') {
                            const id = m.spec.location.join(':');
                            const tile: z.infer<typeof Manifest> = {
                                kind: 'Tile',
                                spec: {
                                    biome: 'DISCOVERED',
                                    location: m.spec.location,
                                },
                            };
                            manifests = new Map(manifests.set(id, [tile, m]));
                        }
                    });
                    return manifests;
                });
                setBuildingKinds((kinds) => {
                    importedManifests.forEach((m) => {
                        if (m.kind === 'BuildingKind') {
                            kinds = new Map(kinds.set(m.spec.name, m));
                        }
                    });
                    return kinds;
                });
            })
            .catch((err) => console.error(`failed to parse manifests: ${err}`));
    }, []);

    const buildingForTile = useCallback(
        (t: GridTile) => {
            const building = manifests.get(t.id)?.find((m) => m.kind === 'Building');
            if (!building || building.kind !== 'Building') {
                return undefined;
            }
            const kind = buildingKinds.get(building.spec.name);
            if (!kind) {
                return undefined;
            }
            const label = building.spec.name;
            const model = (() => {
                switch (kind.spec.category) {
                    case 'factory':
                        return '/models/factory.fbx';
                    case 'extractor':
                        return '/models/extractor.fbx';
                    case 'blocker':
                        return '/models/blocker.fbx';
                    default:
                        return '/models/custom.fbx';
                }
            })();
            return <Building key={t.id} model={model} position={t.position} name={label} showLabels={labels} />;
        },
        [buildingKinds, manifests, labels]
    );

    const previewState = useMemo(() => {
        if (!preview) {
            return;
        }
        const worldBuildingForTile = (t: GridTile): WorldBuildingFragment | undefined => {
            const [q, r, s] = t.location;
            const id = CompoundKeyEncoder.encodeInt16(NodeSelectors.Building, 0, r, q, s);
            const tileManifests = manifests.get(t.id);
            if (!tileManifests) {
                return undefined;
            }
            const building = tileManifests.find((m) => m.kind === 'Building');
            if (!building || building.kind !== 'Building') {
                return undefined;
            }
            const kind = buildingKinds.get(building.spec.name);
            if (!kind || kind.kind != 'BuildingKind') {
                return undefined;
            }

            const kindNameID = Number(BigInt.asUintN(32, BigInt(keccak256UTF8(`building/${name}`))));
            const categoryID =
                {
                    none: 0,
                    blocker: 1,
                    extractor: 2,
                    factory: 3,
                    custom: 4,
                    display: 5,
                    billboard: 6,
                }[kind.spec.category] || 0;
            const kindID = solidityPacked(
                ['bytes4', 'uint32', 'uint64', 'uint64'],
                [NodeSelectors.BuildingKind, 0, kindNameID, categoryID]
            );
            const tileId = CompoundKeyEncoder.encodeInt16(NodeSelectors.Tile, 0, r, q, s);
            const tileCoords = [0, q, r, s].map((n) => ethers.toBeHex(ethers.toTwos(n, 16)));
            return {
                id,
                kind: {
                    id: kindID,
                    name: { value: kind.spec.name },
                    description: { value: kind.spec.description || '' },
                    model: { value: kind.spec.model },
                    materials: [],
                    inputs: [],
                    outputs: [],
                },
                location: { id: tileId, key: 0, time: 0, tile: { id: tileId, coords: tileCoords } },
                timestamp: null,
                gooReservoir: [],
                allData: [],
            };
        };

        const worldTiles = grid.map((t) => {
            const [q, r, s] = t.location;
            const id = CompoundKeyEncoder.encodeInt16(NodeSelectors.Tile, 0, r, q, s);
            const coords = [0, q, r, s].map((n) => ethers.toBeHex(ethers.toTwos(n, 16)));
            const tileManifests = manifests.get(t.id);
            const isDiscovered = tileManifests && tileManifests.length != 0;
            if (!isDiscovered) {
                return;
            }
            return {
                id,
                coords,
                bagCount: 0,
                bagBalances: [],
                biome: isDiscovered ? BiomeKind.DISCOVERED : BiomeKind.UNDISCOVERED,
                mobileUnits: [],
                sessions: [],
                bags: [],
                atoms: [],
                building: worldBuildingForTile(t),
            };
        });

        return {
            world: {
                buildings: worldTiles.map((t) => t?.building).filter((b) => !!b) as WorldBuildingFragment[],
                players: [],
                block: 1,
            },
            tiles: worldTiles.filter((t) => !!t) as WorldTileFragment[],
        };
    }, [grid, manifests, preview, buildingKinds]);

    const onMoveTiles = useCallback(
        (d: [number, number, number]) => {
            setManifests((prev) => {
                const next = new Map();
                for (const [id, manifests] of prev) {
                    const [q, r, s] = id.split(':').map(Number);
                    const nextID = [q + d[0], r + d[1], s + d[2]].join(':');
                    next.set(nextID, manifests);
                }
                return next;
            });
        },
        [setManifests]
    );

    useEffect(() => {
        const handleKeyDown = (event) => {
            const direction = 1;
            switch (event.key) {
                case 'd':
                    onMoveTiles([direction, 0, -direction]);
                    break;
                case 'w':
                    onMoveTiles([0, direction, -direction]);
                    break;
                case 'q':
                    onMoveTiles([-direction, direction, 0]);
                    break;
                case 'a':
                    onMoveTiles([-direction, 0, direction]);
                    break;
                case 's':
                    onMoveTiles([0, -direction, direction]);
                    break;
                case 'e':
                    onMoveTiles([direction, -direction, 0]);
                    break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onMoveTiles]);

    if (!stateLoaded) {
        return <div>loading</div>;
    }

    return (
        <div
            style={{
                width: '100vw',
                height: '100vh',
                position: 'fixed',
                display: preview ? 'none' : 'block',
                zIndex: 50,
                background: '#335c90',
            }}
        >
            <Canvas
                onPointerMissed={() => {}}
                onPointerDown={(e) => {
                    if (e.button == 0) {
                        e.stopPropagation();
                        setMouseDown(true);
                        return;
                    }
                }}
                onPointerUp={(e) => {
                    if (e.button == 0) {
                        e.stopPropagation();
                        setMouseDown(false);
                        return;
                    }
                }}
            >
                <MapControls makeDefault enablePan={false} />
                <ambientLight color="#ffffff" intensity={0.55} />
                <directionalLight color="#fff" position={[100, 100, 100]} />
                <OrthographicCamera makeDefault zoom={20} near={0} far={10000} position={[0, 100, 0]} />
                <Grid tiles={grid} manifests={manifests} onPaintTile={onPaintTile} />
                {grid.map(buildingForTile).filter((v) => !!v)}
            </Canvas>

            <input
                ref={fileRef}
                type="file"
                onChange={onLoadManifests}
                id="fileElem"
                multiple
                style={{ display: 'none' }}
            />
            {mapReady && previewState && (
                <>
                    <GroundPlane height={-0.1} />
                    <Tiles tiles={previewState?.tiles || []} />
                    <Buildings tiles={previewState?.tiles || []} buildings={previewState?.world?.buildings || []} />
                </>
            )}
        </div>
    );
};

export default function Page() {
    const config = useConfig();

    return (
        <UnityMapProvider>
            <GameStateProvider config={config}>
                <TileFab />
            </GameStateProvider>
        </UnityMapProvider>
    );
}

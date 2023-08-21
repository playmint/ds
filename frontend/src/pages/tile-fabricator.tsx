/** @format */

import { FunctionComponent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';

import {
    BiomeKind,
    CompoundKeyEncoder,
    NodeSelectors,
    WorldBuildingFragment,
    WorldTileFragment,
} from '@app/../../core/src';
import { UnityMap, useUnityMap } from '@app/components/organisms/unity-map';
import { useThrottle } from '@app/hooks/use-throttle';
import { BuildingKind, Manifest, parseManifestDocuments } from '@playmint/ds-cli/src/utils/manifest';
import { Html, Instance, Instances, MapControls, OrthographicCamera, useFBX } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { ethers, id as keccak256UTF8, solidityPacked } from 'ethers';
import { button, useControls } from 'leva';
import * as THREE from 'three';
import YAML from 'yaml';

const TILE_SIZE = 1;

// ------------

function getTileXYZ([q, r]: [number, number, number], size = TILE_SIZE): [number, number, number] {
    const x = size * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
    const y = 0;
    const z = size * ((3 / 2) * r);
    return [x, y, -z];
}

type ManifestMap = Map<string, z.infer<typeof Manifest>[]>; // map of locationid => Manifests
type BuildingKindMap = Map<string, z.infer<typeof BuildingKind>>; // map of building kinds name => spec
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

export const TileFab: FunctionComponent<PageProps> = ({}: PageProps) => {
    const fileRef = useRef<any>();
    const [manifestsz, setManifests] = useState<ManifestMap>(new Map());
    const manifests = useThrottle(manifestsz, 15);
    const [mouseDown, setMouseDown] = useState(false);
    const [buildingKinds, setBuildingKinds] = useState<BuildingKindMap>(new Map());
    const { unityProvider, sendMessage } = useUnityMap();

    const [{ diameter, brush, labels }] = useControls(
        'Tiles',
        () => {
            return {
                diameter: { value: 30, min: 5, max: 40, step: 1 },
                brush: {
                    options: ['DISCOVERED TILE', 'UNDISCOVERED TILE'].concat(
                        Array.from(buildingKinds.values())
                            .map(({ spec }) => spec.name)
                            .sort()
                    ),
                },
                labels: false,
            };
        },
        [buildingKinds, Array.from(buildingKinds.values()).length]
    );

    const tiles = useMemo(() => {
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
            Reset: button(() => setManifests(new Map())),
            Import: button(() => fileRef.current.click()),
            Export: button(() => window.location.replace(getManifestDownloadURL())),
        }),
        [getManifestDownloadURL]
    );

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
                            },
                        },
                    ];
                }
            })();
            if (typeof newManifestsForTile !== 'undefined') {
                setManifests((prev) => new Map(prev.set(t.id, newManifestsForTile)));
            }
        },
        [mouseDown, brush, buildingKinds, manifests]
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

    useEffect(() => {
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
                }[kind.spec.category] || 0;
            const kindID = solidityPacked(
                ['bytes4', 'uint32', 'uint64', 'uint64'],
                [NodeSelectors.BuildingKind, 0, kindNameID, categoryID]
            );
            return {
                id,
                kind: {
                    id: kindID,
                    name: { id: '', value: kind.spec.name },
                    model: { id: '', value: kind.spec.model },
                    materials: [],
                    inputs: [],
                    outputs: [],
                },
                bags: [],
                timestamp: [],
                gooReservoir: [],
            };
        };

        const worldTiles: WorldTileFragment[] = tiles.map((t) => {
            const [q, r, s] = t.location;
            const id = CompoundKeyEncoder.encodeInt16(NodeSelectors.Tile, 0, r, q, s);
            const coords = [0, q, r, s].map((n) => ethers.toBeHex(ethers.toTwos(n, 16)));
            const tileManifests = manifests.get(t.id);
            const isDiscovered = tileManifests && tileManifests.length != 0;
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

        const args: any[][] = [];
        args.push([
            'GameStateMediator',
            'StartOnState',
            JSON.stringify({ tiles: [], buildings: [], players: [], block: 1 }),
        ]);
        args.push(['GameStateMediator', 'ResetWorldTiles']);
        args.push(['GameStateMediator', 'AddWorldTiles', JSON.stringify(worldTiles)]);
        args.push(['GameStateMediator', 'EndOnState']);
        for (let i = 0; i < args.length; i++) {
            sendMessage(args[i][0], args[i][1], args[i][2]);
        }
    }, [sendMessage, tiles, manifests, preview, buildingKinds]);

    return (
        <div style={{ width: '100%', height: '100%', position: 'absolute' }}>
            <div
                style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 0, display: preview ? 'block' : 'none' }}
            >
                <UnityMap unityProvider={unityProvider} />
            </div>
            <div
                style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 0, display: preview ? 'none' : 'block' }}
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
                    <Grid tiles={tiles} manifests={manifests} onPaintTile={onPaintTile} />
                    {tiles.map(buildingForTile).filter((v) => !!v)}
                </Canvas>
                <input
                    ref={fileRef}
                    type="file"
                    onChange={onLoadManifests}
                    id="fileElem"
                    multiple
                    style={{ display: 'none' }}
                />
            </div>
        </div>
    );
};

export default TileFab;

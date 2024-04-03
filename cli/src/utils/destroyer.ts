import { CogAction, NodeSelectors } from '@downstream/core';
import { BuildingKindFragment } from '@downstream/core/src/gql/graphql';
import { id as keccak256UTF8, solidityPacked } from 'ethers';
import { z } from 'zod';
import {
    BuildingCategoryEnum,
    BuildingCategoryEnumVals,
    ManifestDocument,
} from '../utils/manifest';
import { isInBounds } from '../utils/bounds';

export const encodeTileID = ({ q, r, s }: { q: number; r: number; s: number }) => {
    return solidityPacked(
        ['bytes4', 'uint96', 'int16', 'int16', 'int16', 'int16'],
        [NodeSelectors.Tile, 0, 0, q, r, s]
    );
};

export const encodeBagID = ({ q, r, s }: { q: number; r: number; s: number }) => {
    return solidityPacked(['bytes4', 'uint96', 'int16', 'int16', 'int16', 'int16'], [NodeSelectors.Bag, 0, 0, q, r, s]);
};

const encodeBuildingKindID = ({ name, category }) => {
    const id = Number(BigInt.asUintN(32, BigInt(keccak256UTF8(`building/${name}`))));
    const categoryEnum = getBuildingCategoryEnum(category);
    return solidityPacked(['bytes4', 'uint32', 'uint64', 'uint64'], [NodeSelectors.BuildingKind, 0, id, categoryEnum]);
};

const getBuildingCategoryEnum = (category: BuildingCategoryEnum): number => {
    return BuildingCategoryEnumVals.indexOf(category);
};

const getBuildingKindIDByName = (existingBuildingKinds, pendingBuildingKinds, name: string) => {
    const foundBuildingKinds = existingBuildingKinds.filter((buildingKind) => buildingKind.name?.value === name);
    if (foundBuildingKinds.length === 1) {
        const buildingKind = foundBuildingKinds[0];
        if (!buildingKind.id) {
            throw new Error(`missing status.id field for BuildingKind ${name}`);
        }
        return buildingKind.id;
    } else if (foundBuildingKinds.length > 1) {
        throw new Error(
            `BuildingKind ${name} is ambiguous, found ${foundBuildingKinds.length} existing BuildingKinds with that name`
        );
    }
    // find ID based on pending specs
    const manifests = pendingBuildingKinds.filter((m) => m.spec.name == name);
    if (manifests.length === 0) {
        throw new Error(
            `unable to find BuildingKind id for reference: ${name}, are you missing an BuildingKind manifest?`
        );
    }
    if (manifests.length > 1) {
        throw new Error(
            `BuildingKind ${name} is ambiguous, found ${manifests.length} different manifests that declare BuildingKinds with that name`
        );
    }
    const manifest = manifests[0];
    if (manifest.kind !== 'BuildingKind') {
        throw new Error(`unexpected kind: wanted BuildingKind got ${manifest.kind}`);
    }
    return encodeBuildingKindID(manifest.spec);
};

export const getOpsForManifests = async (
    docs,
    existingBuildingKinds: BuildingKindFragment[],
): Promise<OpSet[]> => {
    const pendingBuildingKinds = docs.map((doc) => doc.manifest).filter(({ kind }) => kind === 'BuildingKind');

    // build list of operations
    const opsets: OpSet[] = [];
    let opn = -1;

    // destroy building instances
    opn++;
    opsets[opn] = [];
    for (const doc of docs) {
        if (doc.manifest.kind != 'Building') {
            continue;
        }
        const spec = doc.manifest.spec;
        const [q, r, s] = spec.location;
        const inBounds = isInBounds(q, r, s);
        
        opsets[opn].push({
            doc,
            actions: [
                {
                    name: 'DEV_DESTROY_BUILDING',
                    args: [
                        getBuildingKindIDByName(existingBuildingKinds, pendingBuildingKinds, spec.name),
                        ...spec.location,
                    ],
                },
            ],
            note: `destroyed building instance of ${spec.name} at ${spec.location.join(',')}`,
            inBounds: inBounds,
        });
    }

    // destroy tile manifests (this is only valid while cheats are enabled)
    opn++;
    opsets[opn] = [];
    for (const doc of docs) {
        if (doc.manifest.kind != 'Tile') {
            continue;
        }
        const spec = doc.manifest.spec;
        const [q, r, s] = spec.location;
        const inBounds = isInBounds(q, r, s);

        opsets[opn].push({
            doc,
            actions: [
                {
                    name: 'DEV_DESTROY_TILE',
                    args: spec.location,
                },
            ],
            note: `destroyed tile ${spec.location.join(',')}`,
            inBounds: inBounds,
        });
    }

    // destory bag manifests (this is only valid while cheats are enabled)
    opn++;
    opsets[opn] = [];
    for (const doc of docs) {
        if (doc.manifest.kind != 'Bag') {
            continue;
        }

        const spec = doc.manifest.spec;
        const [q, r, s] = spec.location;
        const inBounds = isInBounds(q, r, s);

        const bagID = encodeBagID({ q, r, s });
        const ownerAddress = solidityPacked(['uint160'], [0]); // public
        const equipee = encodeTileID({ q, r, s });
        const equipSlot = 0;

        opsets[opn].push({
            doc,
            actions: [
                {
                    name: 'DEV_DESTROY_BAG',
                    args: [bagID, ownerAddress, equipee, equipSlot],
                },
            ],
            note: `destroyed bag ${spec.location.join(',')}`,
            inBounds: inBounds,
        });
    }

    return opsets;
};

export type Op = {
    doc: z.infer<typeof ManifestDocument>;
    actions: CogAction[];
    note: string;
    inBounds?: boolean;
};

export type OpSet = Op[];
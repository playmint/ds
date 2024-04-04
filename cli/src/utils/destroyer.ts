import { CogAction, NodeSelectors } from '@downstream/core';
import { BuildingKindFragment, ItemFragment, WorldStateFragment } from '@downstream/core/src/gql/graphql';
import { id as keccak256UTF8, solidityPacked } from 'ethers';
import { z } from 'zod';
import {
    BuildingCategoryEnum,
    BuildingCategoryEnumVals,
    ManifestDocument,
    Slot,
} from '../utils/manifest';
import { isInBounds } from '../utils/bounds';

export const encodeTileID = ({ q, r, s }: { q: number; r: number; s: number }) => {
    return solidityPacked(
        ['bytes4', 'uint96', 'int16', 'int16', 'int16', 'int16'],
        [NodeSelectors.Tile, 0, 0, q, r, s]
    );
};

export const encodeItemID = ({
    name,
    stackable,
    goo,
}: {
    name: string;
    stackable: boolean;
    goo: { red: number; green: number; blue: number };
}) => {
    const id = Number(BigInt.asUintN(32, BigInt(keccak256UTF8(`item/${name}`))));
    return solidityPacked(
        ['bytes4', 'uint32', 'uint32', 'uint32', 'uint32', 'uint32'],
        [NodeSelectors.Item, id, stackable ? 1 : 0, goo.green, goo.blue, goo.red]
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

const getItemIdByName = (files, existingItems: ItemFragment[], name: string): string => {
    const foundItems = existingItems.filter((item) => item.name?.value === name);
    if (foundItems.length === 1) {
        const item = foundItems[0];
        if (!item.id) {
            throw new Error(`missing item.id field for Item ${name}`);
        }
        return item.id;
    } else if (foundItems.length > 1) {
        throw new Error(`item ${name} is ambiguous, found ${foundItems.length} existing items with that name`);
    }
    // find ID based on pending specs
    const manifests = files
        .map((file) => file.manifest)
        .filter((manifest) => manifest.kind === 'Item' && manifest.spec.name === name);
    if (manifests.length === 0) {
        throw new Error(`unable to find Item id for reference: ${name}, are you missing an Item manifest?`);
    }
    if (manifests.length > 1) {
        throw new Error(
            `item ${name} is ambiguous, found ${manifests.length} different manifests that declare items with that name`
        );
    }
    const manifest = manifests[0];
    if (manifest.kind !== 'Item') {
        throw new Error(`unexpected kind: wanted Item got ${manifest.kind}`);
    }
    return encodeItemID(manifest.spec);
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
    world: WorldStateFragment,
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

        const encodeSlotConfig = (slots: ReturnType<typeof Slot.parse>[]) => {
            const items = [0, 0, 0, 0].map((_, idx) =>
                slots[idx]
                    ? getItemIdByName(docs, world.items, slots[idx].name)
                    : '0x000000000000000000000000000000000000000000000000'
            );
            const quantities = [0, 0, 0, 0].map((_, idx) => (slots[idx] ? slots[idx].quantity : 0));
            return { items, quantities };
        };

        const spec = doc.manifest.spec;
        const [q, r, s] = spec.location;
        const inBounds = isInBounds(q, r, s);

        const bagID = encodeBagID({ q, r, s });
        const ownerAddress = solidityPacked(['uint160'], [0]); // public
        const equipee = encodeTileID({ q, r, s });
        const equipSlot = 0;

        const bagContents = encodeSlotConfig(spec.items || []);
        const slotContents = bagContents.items;

        opsets[opn].push({
            doc,
            actions: [
                {
                    name: 'DEV_DESTROY_BAG',
                    args: [bagID, ownerAddress, equipee, equipSlot, slotContents],
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
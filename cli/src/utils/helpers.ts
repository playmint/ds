import { ItemFragment, NodeSelectors } from '@downstream/core';
import { id as keccak256UTF8, solidityPacked } from 'ethers';
import { BuildingCategoryEnum, BuildingCategoryEnumVals } from '../utils/manifest';

export const encodeTileID = ({ z, q, r, s }: { z: number; q: number; r: number; s: number }) => {
    return solidityPacked(
        ['bytes4', 'uint96', 'int16', 'int16', 'int16', 'int16'],
        [NodeSelectors.Tile, 0, z, q, r, s]
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

export const encodeBagID = ({ z, q, r, s }: { z: number; q: number; r: number; s: number }) => {
    return solidityPacked(['bytes4', 'uint96', 'int16', 'int16', 'int16', 'int16'], [NodeSelectors.Bag, 0, z, q, r, s]);
};

export const encodeBuildingKindID = ({ name, category }) => {
    const id = Number(BigInt.asUintN(32, BigInt(keccak256UTF8(`building/${name}`))));
    const categoryEnum = getBuildingCategoryEnum(category);
    return solidityPacked(['bytes4', 'uint32', 'uint64', 'uint64'], [NodeSelectors.BuildingKind, 0, id, categoryEnum]);
};

export const getBuildingCategoryEnum = (category: BuildingCategoryEnum): number => {
    return BuildingCategoryEnumVals.indexOf(category);
};

export const getItemIdByName = (files, existingItems: ItemFragment[], name: string): string => {
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

export const getBuildingKindIDByName = (existingBuildingKinds, pendingBuildingKinds, name: string) => {
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

import { BuildingKindFragment, WorldBuildingFragment } from '@downstream/core';
import { AbiCoder, ethers } from 'ethers';

export enum BuildingCategory {
    NONE,
    BLOCKER,
    EXTRACTOR,
    ITEM_FACTORY,
}
export function getBuildingCategory(kind?: BuildingKindFragment | null) {
    if (!kind) {
        return BuildingCategory.NONE;
    }

    const buildingCategory = parseInt('0x' + kind.id.slice(-2));
    switch (buildingCategory) {
        case BuildingCategory.BLOCKER:
            return BuildingCategory.BLOCKER;
        case BuildingCategory.EXTRACTOR:
            return BuildingCategory.EXTRACTOR;
        case BuildingCategory.ITEM_FACTORY:
            return BuildingCategory.ITEM_FACTORY;
        default:
            return BuildingCategory.NONE;
    }
}
export function getLogicCellKind(kind?: BuildingKindFragment | null) {
    if (!kind) {
        return 0;
    }

    const logicCellKind = parseInt('0x' + kind.id.slice(-16, -8));
    return logicCellKind;
}
export function isExtractor(kind: BuildingKindFragment) {
    return getBuildingCategory(kind) == BuildingCategory.EXTRACTOR;
}
export function getBuildingName(building: WorldBuildingFragment) {
    const keccak256Hash = ethers.keccak256(AbiCoder.defaultAbiCoder().encode(['bytes24'], [building.id]));
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const letterIdx = parseInt('0x' + keccak256Hash.slice(-8)) % letters.length;
    return building.kind?.name?.value + ' ' + letters[letterIdx];
}

import { BuildingKindFragment } from '@downstream/core';

export enum BuildingCategory {
    NONE,
    BLOCKER,
    EXTRACTOR,
    ITEM_FACTORY,
    CUSTOM,
    GENERATOR,
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
        case BuildingCategory.GENERATOR:
            return BuildingCategory.GENERATOR;
        default:
            return BuildingCategory.NONE;
    }
}
export function isExtractor(kind: BuildingKindFragment) {
    return getBuildingCategory(kind) == BuildingCategory.EXTRACTOR;
}

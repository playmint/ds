import { BuildingKindFragment } from '@downstream/core';

export enum BuildingCategory {
    NONE,
    BLOCKER,
    EXTRACTOR,
    ITEM_FACTORY
}
export function isExtractor(kind: BuildingKindFragment) {
    const buildingCategory = parseInt('0x' + kind.id.slice(-2));
    return buildingCategory == BuildingCategory.EXTRACTOR;
}

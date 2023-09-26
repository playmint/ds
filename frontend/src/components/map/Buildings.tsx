import { BuildingCategory, getBuildingCategory } from '@app/helpers/building';
import { GOO_BLUE, GOO_GREEN, GOO_RED, getTileHeightFromCoords, getUnscaledNoiseFromCoords } from '@app/helpers/tile';
import { BuildingKindFragment, WorldBuildingFragment, getCoords } from '@downstream/core';
import { memo, useMemo } from 'react';
import { BlockerBuilding } from './BlockerBuilding';
import { ExtractorBuilding } from './ExtractorBuilding';
import { FactoryBuilding } from './FactoryBuilding';

function getColorFromGoo(kind) {
    const outputName = kind?.outputs?.find((e) => ['Green Goo', 'Blue Goo', 'Red Goo'].includes(e.item.name?.value))
        ?.item.name?.value;
    switch (outputName) {
        case 'Green Goo':
            return '#63B204FF';
        case 'Red Goo':
            return '#CA002BFF';
        case 'Blue Goo':
            return '#0665F5FF';
        default:
            return '#FFFFFFFF';
    }
}

const getGooIndexFromBuildingOutput = (buildingKind?: BuildingKindFragment) => {
    if (buildingKind?.outputs && buildingKind.outputs.length > 0) {
        const outputName = buildingKind.outputs[0].item.name?.value;

        switch (outputName) {
            case 'Green Goo':
                return GOO_GREEN;
            case 'Red Goo':
                return GOO_RED;
            case 'Blue Goo':
                return GOO_BLUE;
        }
    }

    return -1;
};

const lerp = (x, y, a) => x * (1 - a) + y * a;

export const Buildings = memo(
    ({
        buildings,
        selectedElementID,
        onClickBuilding,
    }: {
        buildings?: WorldBuildingFragment[];
        selectedElementID?: string;
        onClickBuilding: (id: string) => void;
    }) => {
        const buildingComponents = useMemo(
            () =>
                (buildings || []).map((b) => {
                    if (!b.kind) {
                        return null;
                    }
                    if (!b.location?.tile) {
                        return null;
                    }
                    const coords = getCoords(b.location.tile);
                    const height = getTileHeightFromCoords(coords);
                    const selected = selectedElementID === b.id ? 'outline' : 'none';
                    const rotation = lerp(-20, 20, 0.5 - getUnscaledNoiseFromCoords(coords));
                    if (getBuildingCategory(b.kind) == BuildingCategory.EXTRACTOR) {
                        return (
                            <ExtractorBuilding
                                key={b.id}
                                id={b.id}
                                atoms={(b.location.tile?.atoms || [])
                                    .sort((a, b) => a.key - b.key)
                                    .map((elm) => elm.weight)}
                                lastExtraction={b.timestamp?.blockNum || 0}
                                gooReservoir={b.gooReservoir}
                                gooIndex={getGooIndexFromBuildingOutput(b?.kind)}
                                height={height}
                                rotation={rotation}
                                color={getColorFromGoo(b.kind)}
                                selected={selected}
                                onPointerClick={onClickBuilding}
                                {...coords}
                            />
                        );
                    } else if (getBuildingCategory(b.kind) == BuildingCategory.BLOCKER) {
                        return (
                            <BlockerBuilding
                                key={b.id}
                                id={b.id}
                                height={height}
                                model={b.kind?.model?.value}
                                rotation={rotation}
                                selected={selected}
                                onPointerClick={onClickBuilding}
                                {...coords}
                            />
                        );
                    } else {
                        return (
                            <FactoryBuilding
                                key={b.id}
                                id={b.id}
                                height={height}
                                model={b.kind?.model?.value}
                                rotation={rotation}
                                selected={selected}
                                onPointerClick={onClickBuilding}
                                {...coords}
                            />
                        );
                    }
                }),
            [buildings, selectedElementID, onClickBuilding]
        );

        return <>{buildingComponents}</>;
    }
);

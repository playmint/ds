import { BuildingCategory, getBuildingCategory } from '@app/helpers/building';
import { GOO_BLUE, GOO_GREEN, GOO_RED, getTileHeight, getUnscaledNoise } from '@app/helpers/tile';
import { BuildingKindFragment, WorldTileFragment, getCoords } from '@downstream/core';
import { memo, useMemo } from 'react';
import { ExtractorBuilding } from './ExtractorBuilding';
import { BlockerBuilding } from './BlockerBuilding';
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
        tiles,
        selectedElementID,
        onClickBuilding,
    }: {
        tiles?: WorldTileFragment[];
        selectedElementID?: string;
        onClickBuilding: (id: string) => void;
    }) => {
        const buildingComponents = useMemo(() => {
            if (!tiles) {
                return [];
            }

            console.time('buildingLoop');

            const bs = tiles
                .filter((t) => !!t.building)
                .map((t) => {
                    const coords = getCoords(t);
                    if (!t.building || !t.building.kind) {
                        return null;
                    }
                    const selected = selectedElementID === t.building?.id ? 'outline' : 'none';
                    if (getBuildingCategory(t.building.kind) == BuildingCategory.EXTRACTOR) {
                        return (
                            <ExtractorBuilding
                                key={t.building.id}
                                id={t.building.id}
                                atoms={(t.atoms || []).sort((a, b) => a.key - b.key).map((elm) => elm.weight)}
                                lastExtraction={t.building.timestamp?.blockNum || 0}
                                gooReservoir={t.building.gooReservoir}
                                gooIndex={getGooIndexFromBuildingOutput(t.building?.kind)}
                                height={getTileHeight(t)}
                                rotation={lerp(-20, 20, 0.5 - getUnscaledNoise(t))}
                                color={getColorFromGoo(t.building.kind)}
                                selected={selected}
                                onPointerClick={onClickBuilding}
                                {...coords}
                            />
                        );
                    } else if (getBuildingCategory(t.building.kind) == BuildingCategory.BLOCKER) {
                        return (
                            <BlockerBuilding
                                key={t.building.id}
                                id={t.building.id}
                                height={getTileHeight(t)}
                                model={t.building.kind?.model?.value}
                                rotation={lerp(-20, 20, 0.5 - getUnscaledNoise(t))}
                                selected={selected}
                                onPointerClick={onClickBuilding}
                                {...coords}
                            />
                        );
                    } else {
                        return (
                            <FactoryBuilding
                                key={t.building.id}
                                id={t.building.id}
                                height={getTileHeight(t)}
                                model={t.building.kind?.model?.value}
                                rotation={lerp(-20, 20, 0.5 - getUnscaledNoise(t))}
                                selected={selected}
                                onPointerClick={onClickBuilding}
                                {...coords}
                            />
                        );
                    }
                });
            console.timeEnd('buildingLoop');
            return bs;
        }, [tiles, selectedElementID, onClickBuilding]);

        return <>{buildingComponents}</>;
    }
);

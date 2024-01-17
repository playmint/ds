import { BuildingCategory, getBuildingCategory } from '@app/helpers/building';
import { GOO_BLUE, GOO_GREEN, GOO_RED, getTileHeightFromCoords, getUnscaledNoiseFromCoords } from '@app/helpers/tile';
import {
    BuildingKindFragment,
    PluginMapProperty,
    WorldBuildingFragment,
    WorldTileFragment,
    getCoords,
} from '@downstream/core';
import { memo, useMemo } from 'react';
import { BlockerBuilding } from './BlockerBuilding';
import { ExtractorBuilding } from './ExtractorBuilding';
import { FactoryBuilding } from './FactoryBuilding';
import { DisplayBuilding } from './DisplayBuilding';

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
        buildings,
        selectedElementID,
        onClickBuilding,
        randomTileProperties,
    }: {
        tiles: WorldTileFragment[];
        buildings: WorldBuildingFragment[];
        selectedElementID?: string;
        onClickBuilding: (id: string) => void;
        randomTileProperties: PluginMapProperty[];
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
                    const tile = tiles.find(({ id }) => id === b.location?.tile.id);
                    if (getBuildingCategory(b.kind) == BuildingCategory.EXTRACTOR) {
                        return (
                            <ExtractorBuilding
                                key={b.id}
                                id={b.id}
                                atoms={(tile?.atoms || []).sort((a, b) => a.key - b.key).map((elm) => elm.weight)}
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
                    } else if (getBuildingCategory(b.kind) == BuildingCategory.DISPLAY) {
                        const labelText = randomTileProperties
                            .find((prop) => prop.id == b.id && prop.key == 'labelText')
                            ?.value.toString();
                        const startTimeObject = randomTileProperties.find(
                            (prop) => prop.id == b.id && prop.key == 'countdown-start'
                        )?.value as unknown as { start: number };

                        const endTimeObject = randomTileProperties.find(
                            (prop) => prop.id == b.id && prop.key == 'countdown-end'
                        )?.value as unknown as { end: number };
                        return (
                            <DisplayBuilding
                                model={b.kind?.model?.value}
                                startTime={startTimeObject}
                                endTime={endTimeObject}
                                labelText={labelText}
                                sendScreenPosition={true}
                                screenPositionHeightOffset={0.55}
                                key={b.id}
                                id={b.id}
                                height={height}
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
                                rotation={-30}
                                selected={selected}
                                onPointerClick={onClickBuilding}
                                {...coords}
                            />
                        );
                    }
                }),
            [buildings, selectedElementID, tiles, onClickBuilding, randomTileProperties]
        );

        return <>{buildingComponents}</>;
    }
);

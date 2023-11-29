import { BuildingCategory, getBuildingCategory } from '@app/helpers/building';
import {
    GOO_BLUE,
    GOO_GOLD,
    GOO_GREEN,
    GOO_RED,
    getTileHeightFromCoords,
    getUnscaledNoiseFromCoords,
} from '@app/helpers/tile';
import { BuildingKindFragment, WorldBuildingFragment, WorldTileFragment, getCoords } from '@downstream/core';
import { Fragment, memo, useMemo } from 'react';
import { BlockerBuilding } from './BlockerBuilding';
import { ExtractorBuilding } from './ExtractorBuilding';
import { FactoryBuilding } from './FactoryBuilding';
import { availablePower } from '@app/helpers/power';
import { Light } from './Light';

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
            case 'Gold Goo':
                return GOO_GOLD;
        }
    }

    return -1;
};

const lerp = (x, y, a) => x * (1 - a) + y * a;

export const Buildings = memo(
    ({
        tiles,
        buildings,
        currentBlock,
        selectedElementID,
        onClickBuilding,
    }: {
        tiles: WorldTileFragment[];
        buildings: WorldBuildingFragment[];
        currentBlock: number;
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
                    const tile = tiles.find(({ id }) => id === b.location?.tile.id);
                    const category = getBuildingCategory(b.kind);
                    const pu =
                        category !== BuildingCategory.BLOCKER ? availablePower(b, tiles, buildings, currentBlock) : 0;
                    const light =
                        pu > 0 || category === BuildingCategory.GENERATOR ? (
                            <Light id={b.id} key={`l${b.id}`} height={height} {...coords} />
                        ) : undefined;

                    if (category == BuildingCategory.EXTRACTOR) {
                        return (
                            <Fragment key={b.id}>
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
                                {light}
                            </Fragment>
                        );
                    } else if (category == BuildingCategory.BLOCKER) {
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
                        const label = typeof pu != 'undefined' ? `${pu}PU` : undefined;
                        return (
                            <Fragment key={b.id}>
                                <FactoryBuilding
                                    key={b.id}
                                    id={b.id}
                                    label={label && category === BuildingCategory.GENERATOR ? label : undefined}
                                    height={height}
                                    model={b.kind?.model?.value}
                                    rotation={-30}
                                    selected={selected}
                                    onPointerClick={onClickBuilding}
                                    {...coords}
                                />
                                {light}
                            </Fragment>
                        );
                    }
                }),
            [buildings, selectedElementID, onClickBuilding, tiles, currentBlock]
        );

        return <>{buildingComponents}</>;
    }
);

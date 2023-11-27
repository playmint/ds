import { WorldBuildingFragment, WorldTileFragment } from '@downstream/core';
import { BuildingCategory, getBuildingCategory } from './building';
import { Locatable, getTileDistance } from './tile';

export const PU_MULTIPLIER = 10;

export function isGenerator(thing: any) {
    if (!thing) {
        return false;
    }
    if (!thing.kind) {
        return false;
    }
    return getBuildingCategory(thing.kind) == BuildingCategory.GENERATOR;
}

export function getPowerSources(
    thing: WorldBuildingFragment | WorldTileFragment,
    tiles: WorldTileFragment[],
    buildings: WorldBuildingFragment[],
    seen?: Map<string, boolean>
): Array<WorldBuildingFragment> {
    if (!seen) {
        seen = new Map<string, boolean>();
    }
    if (seen.has(thing.id)) {
        return [];
    }
    seen.set(thing.id, true);
    if (isGenerator(thing)) {
        return [thing] as Array<WorldBuildingFragment>;
    }
    return thing.poweredBy
        .flatMap((power) => {
            switch (power.source.kind) {
                case 'Tile':
                    const t = tiles.find((t) => t.id === power.source.id);
                    if (!t) {
                        return [];
                    }
                    return getPowerSources(t, tiles, buildings, seen);
                case 'Building':
                    const b = buildings.find((b) => b.id === power.source.id);
                    if (!b) {
                        return [];
                    }
                    return getPowerSources(b, tiles, buildings, seen);
                default:
                    console.error('unexpected type in poweredby');
                    return [];
            }
        })
        .filter(isGenerator);
}

export function isPowered(
    thing: WorldBuildingFragment | WorldTileFragment,
    tiles: WorldTileFragment[],
    buildings: WorldBuildingFragment[],
    currentBlock: number
) {
    const powerSources = thing ? getPowerSources(thing, tiles, buildings) : [];
    if (powerSources.length == 0) {
        return false;
    }
    const hasConnectedPower = powerSources.some((source) => availableDirectPowerUnits(source, currentBlock) > 0);
    if (hasConnectedPower) {
        return true;
    }
    const coords = ((thing as any).location?.tile?.coords || (thing as any).coords) as [number, number, number, number];
    const thingLocation = { coords } as Locatable;
    const isCloseToPowerSource = powerSources.some((source) => {
        const sourceLocation = source.location?.tile;
        if (!sourceLocation) {
            return false;
        }
        const dist = getTileDistance(thingLocation, sourceLocation);
        return dist < 2;
    });
    if (isCloseToPowerSource) {
        return true;
    }
    return false;
}

export function availablePower(
    thing: WorldBuildingFragment | WorldTileFragment,
    tiles: WorldTileFragment[],
    buildings: WorldBuildingFragment[],
    currentBlock: number
): number {
    const powerSources = thing ? getPowerSources(thing, tiles, buildings) : [];
    const pu = powerSources.map((source) => availableDirectPowerUnits(source, currentBlock)).find(() => true);
    if (typeof pu != 'undefined') {
        return pu;
    }
    const coords = ((thing as any).location?.tile?.coords || (thing as any).coords) as [number, number, number, number];
    const thingLocation = { coords } as Locatable;
    const isCloseToPowerSource = powerSources.some((source) => {
        const sourceLocation = source.location?.tile;
        if (!sourceLocation) {
            return false;
        }
        const dist = getTileDistance(thingLocation, sourceLocation);
        return dist < 2;
    });
    if (isCloseToPowerSource) {
        return 9999; // unlimited close to pylon
    }
    return 0;
}

export function availableDirectPowerUnits(powerSource: WorldBuildingFragment, currentBlock: number): number {
    const lastBurn = powerSource.timestamp?.blockNum || 0;
    const blocksSinceBurn = currentBlock - lastBurn;
    const lastPUAmount = (powerSource.gooReservoir.find((res) => res.key === 3)?.weight || 0) * PU_MULTIPLIER;
    const numConnectedBuildings = (powerSource.powersCount || 0) + 1;
    const pu = Math.max(lastPUAmount - blocksSinceBurn * numConnectedBuildings, 0);
    // console.log('pu', pu);
    return pu;
}

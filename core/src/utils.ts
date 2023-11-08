import {
    BagFragment,
    WorldBuildingFragment,
    WorldCombatSessionFragment,
    WorldMobileUnitFragment,
    WorldTileFragment,
} from './gql/graphql';

const bagsCache = new WeakMap<any, Map<string, BagFragment[]>>();

export function getBuildingAtTile(buildings: WorldBuildingFragment[], tile: { id: string }) {
    return buildings.find((b) => b.location && b.location.tile.id === tile.id);
}

export function getMobileUnitsAtTile(units: WorldMobileUnitFragment[], tile: { id: string }) {
    return units.filter((b) => b.nextLocation && b.nextLocation.tile.id === tile.id);
}

export function getBagsAtEquipee(bags: BagFragment[], equipee: { id: string }) {
    let cache = bagsCache.get(bags);
    if (!cache) {
        cache = new Map<string, BagFragment[]>();
        bagsCache.set(bags, cache);
        const bagsByKey = bags.sort((a, b) => (b.equipee?.key || 0) - (a.equipee?.key || 0));
        for (const bag of bagsByKey) {
            if (bag.equipee?.node) {
                const equipeeBags = cache.get(bag.equipee.node.id) || [];
                equipeeBags.push(bag);
                cache.set(bag.equipee.node.id, equipeeBags);
            }
        }
    }

    return cache.get(equipee.id) || [];
}

export function getSessionsAtTile(sessions: WorldCombatSessionFragment[], tile: WorldTileFragment) {
    return sessions.filter((s) => s.attackTile?.tile?.id === tile.id || s.defenceTile?.tile?.id === tile.id);
}

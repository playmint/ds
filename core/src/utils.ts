import {
    BagFragment,
    WorldBuildingFragment,
    WorldCombatSessionFragment,
    WorldMobileUnitFragment,
    WorldTileFragment,
} from './gql/graphql';

export function getBuildingAtTile(buildings: WorldBuildingFragment[], tile: { id: string }) {
    return buildings.find((b) => b.location && b.location.tile.id === tile.id);
}

export function getMobileUnitsAtTile(units: WorldMobileUnitFragment[], tile: { id: string }) {
    return units.filter((b) => b.nextLocation && b.nextLocation.tile.id === tile.id);
}

export function getBagsAtEquipee(bags: BagFragment[], equipee: { id: string }) {
    return bags.filter((b) => b.equipee && b.equipee.node?.id === equipee.id);
}

export function getSessionsAtTile(sessions: WorldCombatSessionFragment[], tile: WorldTileFragment) {
    return sessions.filter((s) => s.attackTile?.tile?.id === tile.id || s.defenceTile?.tile?.id === tile.id);
}

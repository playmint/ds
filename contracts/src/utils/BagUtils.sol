// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {State} from "cog/State.sol";
import {Schema, Node, Kind, Rel} from "@ds/schema/Schema.sol";
import {TileUtils} from "@ds/utils/TileUtils.sol";

using Schema for State;

library BagUtils {
    function requireEquipeeLocation(State state, bytes24 equipee, bytes24 mobileUnit, bytes24 location, uint64 atTime)
        internal
        view
    {
        if (equipee == mobileUnit) {
            return; // all good, it's the acting mobileUnit's bag so locations match
        } else if (bytes4(equipee) == Kind.Tile.selector) {
            // located on a tile
            if (TileUtils.distance(location, equipee) > 1 || !TileUtils.isDirect(location, equipee)) {
                revert("NoTransferNotSameLocation");
            }
        } else if (bytes4(equipee) == Kind.Building.selector) {
            // The distance method expects a tile so we can swap out the first 4 bytes
            // of the building for a tile selector because the building ID is based on
            // the location the same as a tile.
            bytes24 mask = 0x00000000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;
            bytes24 buildingLocation = (equipee & mask) | bytes4(Kind.Tile.selector);
            if (TileUtils.distance(location, buildingLocation) > 1 || !TileUtils.isDirect(location, buildingLocation)) {
                revert("NoTransferNotSameLocation");
            }
        } else if (bytes4(equipee) == Kind.MobileUnit.selector) {
            // location on another mobileUnit, check same loc
            bytes24 otherMobileUnitLocation = state.getCurrentLocation(equipee, atTime);
            if (
                TileUtils.distance(location, otherMobileUnitLocation) > 1
                    || !TileUtils.isDirect(location, otherMobileUnitLocation)
            ) {
                revert("NoTransferNotSameLocation");
            }
        } else if (bytes4(equipee) == Kind.CombatSession.selector) {
            // Belongs to combat session. Check both tiles that belong to the session
            (bytes24 tileA,) = state.get(Rel.Has.selector, 0, equipee);
            (bytes24 tileB,) = state.get(Rel.Has.selector, 1, equipee);
            if (
                (TileUtils.distance(location, tileA) > 1 || !TileUtils.isDirect(location, tileA))
                    && (TileUtils.distance(location, tileB) > 1 || !TileUtils.isDirect(location, tileB))
            ) {
                revert("NoTransferNotSameLocation");
            }
        } else {
            revert("NoTransferUnsupportedEquipeeKind");
        }
    }
}

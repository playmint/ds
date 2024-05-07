// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "cog/IGame.sol";
import "cog/IState.sol";
import {ItemKind} from "@ds/ext/ItemKind.sol";
import {Schema, Kind, Node} from "@ds/schema/Schema.sol";

using Schema for State;

contract SpecialItem is ItemKind {
    function onCraft(Game ds, bytes24, /*entity*/ bytes24 buildingInstanceID, bytes24 itemID, uint64 /*itemQty*/ )
        external
        override
    {
        // the Item and the BuildingKind performing the crafting
        // must have the same owner.
        State state = ds.getState();
        bytes24 buildingKind = state.getBuildingKind(buildingInstanceID);
        bytes24 buildingKindOwner = state.getOwner(buildingKind);
        bytes24 itemKind = itemID;
        bytes24 itemKindOwner = state.getOwner(itemKind);
        require(
            itemKindOwner == buildingKindOwner,
            "crafting this item is restricted to building kinds made by the item owner"
        );
    }

    function onExtract(Game ds, bytes24, /*entity*/ bytes24 buildingInstanceID, bytes24 itemID, uint64 /*itemQty*/ )
        external
        override
    {
        // On extract works the same as crafting but in this example we are restricting
        // that extraction can only occur in the zone of the item owner.

        State state = ds.getState();
        bytes24 buildingLocation = state.getFixedLocation(buildingInstanceID);

        bytes24 zoneID = Node.Zone(getTileZone(buildingLocation));
        require(
            state.getOwner(zoneID) == state.getOwner(itemID), "extracting this item is restricted to item owner's zone"
        );
    }

    function onSpawn(Game ds, bytes24 zoneOwner, bytes24, /*zoneID*/ bytes24 itemID, uint64 /*itemQty*/ )
        external
        override
    {
        // items can only be spawed into zones owned by the owner by default
        // override to make more or less permissive
        State state = ds.getState();
        bytes24 itemKind = itemID;
        bytes24 itemKindOwner = state.getOwner(itemKind);
        require(zoneOwner == itemKindOwner, "spawning this item is restricted to owner only");
    }

    function onReward(Game ds, bytes24, /*winner*/ bytes24 sessionID, bytes24 itemID, uint64 /*itemQty*/ )
        external
        override
    {
        // Can only be awarded in a zone that is owned by the item owner
        State state = ds.getState();
        // We find the zone the combat session was in as it's possible that a `winner` may be in a different zone at the time
        // the rewards are given out.
        (bytes24 attackTile,,) = state.getCombatTiles(sessionID);
        bytes24 zoneID = Node.Zone(getTileZone(attackTile));
        require(state.getOwner(zoneID) == state.getOwner(itemID), "rewarding this item is restricted to owner only");
    }

    function getTileZone(bytes24 tile) internal pure returns (int16 z) {
        int16[4] memory keys = CompoundKeyDecoder.INT16_ARRAY(tile);
        return (keys[0]);
    }
}

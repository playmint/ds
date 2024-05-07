// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "cog/IGame.sol";
import "cog/IState.sol";
import {Schema} from "@ds/schema/Schema.sol";

using Schema for State;

interface IItemKind {

    // called when a unit holding itemID issues a USE_ITEM, combine this with item client plugins
    function use(
        Game ds,
        bytes24 itemID,        // item being used
        bytes24 mobileUnitID,  // unit useing the item
        bytes calldata payload // a blob of data for you to decide what to do with
    ) external;

    // called when someone tries to CRAFT this item
    function onCraft(
        Game ds,
        bytes24 player, // player doing the crafting
        bytes24 buildingInstanceID, // where is crafting happening
        bytes24 itemID, // your item id
        uint64 itemQty // amount getting crafted
    ) external;
    
    // called when someone tries to EXTRACT this item
    function onExtract(
        Game ds,
        bytes24 player, // who is extracting
        bytes24 buildingInstanceID, // where is exaction happening
        bytes24 itemID, // your item id
        uint64 itemQty // how many are getting extracted
    ) external;

    // called when someone tries to use their zone's DEV_SPAWN_BAG powers to spawn this item
    function onSpawn(
        Game ds,
        bytes24 player, // player doing the spawning
        bytes24 zoneID, // zone where items are trying to be spawned
        bytes24 itemID, // your item id
        uint64 itemQty // how many are being spawned
    ) external;

    // called when a combat session attempts to distribute itemID as a reward,
    // revert during this hook will skip distribution of this item
    function onReward(
        Game ds,
        bytes24 player, // the player getting rewarded
        bytes24 sessionID, // combat session where item is being distributed from
        bytes24 itemID, // your item id
        uint64 itemQty // how many are being distributed
    ) external;
}

// this is the base IItemKind implementation, if you don't inherit from this
// and override functions then this is the default implementation
contract ItemKind is IItemKind {
    function use(
        Game /*ds*/,
        bytes24 /*itemID*/,
        bytes24 /*mobileUnitID*/,
        bytes calldata /*payload*/
    ) external virtual {
        // inherit and do something here to respond to ITEM_USE actions
    }

    function onCraft(
        Game ds,
        bytes24 /*player*/,
        bytes24 buildingInstanceID,
        bytes24 itemID,
        uint64 /*itemQty*/
    ) external virtual {
        // by default the Item and the BuildingKind performing the crafting
        // must have the same owner. override this function and make it a no-op
        // and your item will be free to be crafted by any building. override
        // and just revert and nobody will be able to craft
        State state = ds.getState();
        bytes24 buildingKind = state.getBuildingKind(buildingInstanceID);
        bytes24 buildingKindOwner = state.getOwner(buildingKind);
        require(buildingKindOwner != 0x0, 'no building kind owner found');
        bytes24 itemKind = itemID;
        bytes24 itemKindOwner = state.getOwner(itemKind);
        require(itemKindOwner == buildingKindOwner, 'crafting this item is restricted to buildings made by the item owner');
    }

    function onExtract(
        Game ds,
        bytes24 /*player*/,
        bytes24 buildingInstanceID,
        bytes24 itemID,
        uint64 /*itemQty*/
    ) external virtual {
        // same behaviour as onCraft
        // override to control who can use your item with EXTRACT actions
        State state = ds.getState();
        bytes24 buildingKind = state.getBuildingKind(buildingInstanceID);
        bytes24 buildingKindOwner = state.getOwner(buildingKind);
        require(buildingKindOwner != 0x0, 'no building kind owner found');
        bytes24 itemKind = itemID;
        bytes24 itemKindOwner = state.getOwner(itemKind);
        require(itemKindOwner == buildingKindOwner, 'crafting this item is restricted to buildings made by the item owner');
    }

    function onSpawn(
        Game ds,
        bytes24 player,
        bytes24 /*zoneID*/,
        bytes24 itemID,
        uint64 /*itemQty*/
    ) external virtual {
        // only only by default ... override to control who and where
        // DEV_SPAWN_BAG can be used with your item
        State state = ds.getState();
        bytes24 itemKind = itemID;
        bytes24 itemKindOwner = state.getOwner(itemKind);
        require(player == itemKindOwner, 'spawning this item is restricted to owner only');
    }

    function onReward(
        Game ds,
        bytes24 /*winner*/,
        bytes24 /*sessionID*/,
        bytes24 /*itemID*/,
        uint64 /*itemQty*/
    ) external virtual {
        // by default this is a no-op and your item will be distributed during
        // combat if a building was contructed with it override and revert in
        // this hook to prevent this behaviour
    }
}

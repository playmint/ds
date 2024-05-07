// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "cog/IGame.sol";

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
        bytes24 winner, // the entity getting the reward, could be a building or unit
        bytes24 sessionID, // combat session where item is being distributed from
        bytes24 itemID, // your item id
        uint64 itemQty // how many are being distributed
    ) external;
}

contract ItemKind is IItemKind {
    function use(
        Game ds,
        bytes24 itemID,
        bytes24 mobileUnitID,
        bytes calldata payload
    ) external virtual {
        // inherit and do something here
    }

    function onCraft(
        Game ds,
        bytes24 player,
        bytes24 buildingInstanceID,
        bytes24 itemID,
        uint64 itemQty
    ) external virtual {
        // inherit and revert here to prevent crafting of your item
    }

    function onExtract(
        Game ds,
        bytes24 player,
        bytes24 buildingInstanceID,
        bytes24 itemID,
        uint64 itemQty
    ) external virtual {
        // inherit and revert here to prevent extraction of your item
    }

    function onSpawn(
        Game ds,
        bytes24 player,
        bytes24 zoneID,
        bytes24 itemID,
        uint64 itemQty
    ) external virtual {
        // inherit and revert here to prevent spawning of your item by other zone owners with DEV_ powers
    }

    function onReward(
        Game ds,
        bytes24 winner,
        bytes24 sessionID,
        bytes24 itemID,
        uint64 itemQty
    ) external virtual {
        // inherit and revert to prevent rewarding $winner with $itemID
    }
}

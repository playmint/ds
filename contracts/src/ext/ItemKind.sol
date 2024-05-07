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
        bytes24 itemID, // item being used
        bytes24 mobileUnitID, // unit useing the item
        bytes calldata payload // a blob of data for you to decide what to do with
    ) external;

    // called when someone tries to CRAFT this item
    function onCraft(
        Game ds,
        bytes24 entity, // account issuing the CRAFT
        bytes24 buildingInstanceID, // where is crafting happening
        bytes24 itemID, // your item id
        uint64 itemQty // amount getting crafted
    ) external;

    // called when a building kind contract tries to EXTRACT this item
    function onExtract(
        Game ds,
        bytes24 entity, // account issuing EXTRACT
        bytes24 buildingInstanceID, // where is exaction happening
        bytes24 itemID, // your item id
        uint64 itemQty // how many are getting extracted
    ) external;

    // called when someone tries to use their zone's DEV_SPAWN_BAG powers to spawn this item
    function onSpawn(
        Game ds,
        bytes24 zoneOwner, // player doing the spawning
        bytes24 zoneID, // zone where items are trying to be spawned
        bytes24 itemID, // your item id
        uint64 itemQty // how many are being spawned
    ) external;

    // called when a combat session attempts to distribute itemID as a reward,
    // revert during this hook will skip distribution of this item
    function onReward(
        Game ds,
        bytes24 winner, // the player getting rewarded
        bytes24 sessionID, // combat session where item is being distributed from
        bytes24 itemID, // your item id
        uint64 itemQty // how many are being distributed
    ) external;
}

// this is the base IItemKind implementation, if you don't inherit from this
// and override functions then this is the default implementation
contract ItemKind is IItemKind {
    function use(Game, /*ds*/ bytes24, /*itemID*/ bytes24, /*mobileUnitID*/ bytes calldata /*payload*/ )
        external
        virtual
    {
        // inherit and do something here to respond to ITEM_USE actions
    }

    function onCraft(
        Game, /*ds*/
        bytes24, /*buildingKindAccount*/
        bytes24, /*buildingInstanceID*/
        bytes24, /*itemID*/
        uint64 /*itemQty*/
    ) external virtual {
        // override to control which buildings can craft your item with CRAFT action
    }

    function onExtract(
        Game, /*ds*/
        bytes24, /*buildingKindAccount*/
        bytes24, /*buildingInstanceID*/
        bytes24, /*itemID*/
        uint64 /*itemQty*/
    ) external virtual {
        // override to control which buildings can use your item with EXTRACT actions
    }

    function onSpawn(Game, /*ds*/ bytes24, /*zoneOwner*/ bytes24, /*zoneID*/ bytes24, /*itemID*/ uint64 /*itemQty*/ )
        external
        virtual
    {
        // override to control which zones can spawn this item into existence with DEV_SPAWN_BAG
    }

    function onReward(Game, /*ds*/ bytes24, /*winner*/ bytes24, /*sessionID*/ bytes24, /*itemID*/ uint64 /*itemQty*/ )
        external
        virtual
    {
        // by default this is a no-op and your item will be distributed during
        // combat if a building was contructed with it override and revert in
        // this hook to prevent this behaviour
    }
}

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {BiomeKind, ResourceKind, AtomKind} from "@ds/schema/Schema.sol";

// ----------------------------------
// define some actions
// ----------------------------------

interface Actions {
    // move seeker with given id from current location to target location
    // seeker id must be owned by ctx.sender
    function MOVE_SEEKER(uint32 sid, int16 q, int16 r, int16 s) external;

    // seeker action to reveal terrain tiles, seeker must be located adjacent
    // to scout location
    function SCOUT_SEEKER(uint32 sid, int16 q, int16 r, int16 s) external;

    // transfers a balance of whatever is in fromBag/fromSlot into toBag/toSlot
    // bags must be at same location as seeker
    // bags must either be owned by seeker or owned by nobody
    function TRANSFER_ITEM_SEEKER(
        bytes24 seeker,
        bytes24[2] calldata equipees,
        uint8[2] calldata equipSlots,
        uint8[2] calldata itemSlots,
        uint64 qty
    ) external;

    // register an external contract as possible building
    function REGISTER_BUILDING_KIND(bytes24 buildingKind, string calldata name) external;

    // register contracts
    function REGISTER_BUILDING_CONTRACT(bytes24 buildingKind, address buildingKindImplementation) external;

    // register plugins for use within supported clients
    //
    // plugins always reference a thing within the state. ie a plugin for a BuildingKind
    //
    // example:
    //
    //  REGISTER_CLIENT_PLUGIN(myRandomlyPickedPluginID, myBuildingKindID, "my-plugin", "function(){}")
    //
    function REGISTER_CLIENT_PLUGIN(bytes24 pluginID, bytes24 targetKind, string calldata name, string calldata src)
        external;

    // construct a building
    function CONSTRUCT_BUILDING_SEEKER(
        bytes24 seeker, // which seeker is performing the construction
        bytes24 buildingKind, // what kind of building
        bytes24 resourceFromEquipee, // paying from bag equip here
        uint8 resourceFromEquipSlot, // ....from this equip slot
        uint8 resourceFromItemSlot, // ....from this item slot
        int16 q,
        int16 r,
        int16 s // which tile to create on (can be adjacent)
    ) external;

    // use a building
    // this action mostly just proxies through to the building kind implementation (if set)
    function BUILDING_USE(bytes24 buildingID, bytes24 seekerID, bytes calldata payload) external;

    function REGISTER_RESOURCE_KIND(ResourceKind rk, AtomKind[] calldata atomKinds, uint64[] calldata numAtoms)
        external;

    function REGISTER_ITEM(
        bytes24[4] calldata inputItems,
        uint64[4] calldata inputQty,
        bool isStackable,
        string calldata name
    ) external;

    function CRAFT_STACKABLE(
        bytes24 inBag,
        bytes24 outItem,
        uint64 outQty,
        bytes24 destBag,
        uint8 destItemSlot // is either empty or of that stackable type
    ) external;

    function CRAFT_EQUIPABLE(
        bytes24 inBag,
        bytes24 outItem,
        bytes24 destBag,
        uint8 destItemSlot // empty
    ) external;

    // spawn a seeker for the sender
    function SPAWN_SEEKER(bytes24 seeker) external;

    // [dev/debug only] spawn a Seeker for any Player with at any Tile
    function DEV_SPAWN_SEEKER(address player, uint32 seekerID, int16 q, int16 r, int16 s) external;

    // [dev/debug only] set a tile biome at any location
    function DEV_SPAWN_TILE(BiomeKind kind, int16 q, int16 r, int16 s) external;

    // spawn a bag with resources equip somewhere
    function DEV_SPAWN_BAG(
        uint64 bagID,
        address owner,
        bytes24 equipee,
        uint8 equipSlot,
        bytes24[] calldata slotContents,
        uint64[] calldata slotBalances
    ) external;
}

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

// TODO: Move BuildingCategory into this file
import {BuildingCategory} from "@ds/schema/Schema.sol";

enum BiomeKind {
    UNDISCOVERED,
    DISCOVERED
}

struct CombatAction {
    CombatActionKind kind;
    bytes24 entityID; // Can be mobileUnit or building
    uint64 blockNum;
    bytes data;
}

enum CombatActionKind {
    NONE,
    JOIN,
    LEAVE,
    EQUIP
}

enum ArgType {
    UINT64,
    INT64,
    BYTES24,
    ADDRESS
}

enum TriggerType {
    ACTION,
    STATE
}

// ----------------------------------
// Actions interface
// ----------------------------------

interface Actions {
    // move mobileUnit with given id from current location to target location
    // mobileUnit id must be owned by ctx.sender
    function MOVE_MOBILE_UNIT(uint32 sid, int16 q, int16 r, int16 s) external;

    // mobileUnit action to reveal terrain tiles, mobileUnit must be located adjacent
    // to scout location
    function SCOUT_MOBILE_UNIT(uint32 sid, int16 q, int16 r, int16 s) external;

    // transfer a qty of items from itemSlot[0] in equipees[0]'s equipSlots[0] bag
    // to itemSlot[1] in equipees[1]'s equipSlots[1] bag
    // bags must be at same location as mobileUnit
    // bags must either be owned by mobileUnit or owned by nobody
    function TRANSFER_ITEM_MOBILE_UNIT(
        bytes24 mobileUnit,
        bytes24[2] calldata equipees,
        uint8[2] calldata equipSlots,
        uint8[2] calldata itemSlots,
        bytes24 toBagId,
        uint64 qty
    ) external;

    // register an external contract as possible building
    function REGISTER_BUILDING_KIND(
        bytes24 buildingKind,
        string calldata name,
        BuildingCategory category,
        string calldata model,
        bytes24[4] calldata materialItem,
        uint64[4] calldata materialQty,
        bytes24[4] calldata inputItemIDs,
        uint64[4] calldata inputItemQtys,
        bytes24[1] calldata outputItemIDs,
        uint64[1] calldata outputItemQtys
    ) external;

    // register kind implementation contract
    function REGISTER_KIND_IMPLEMENTATION(bytes24 kind, address kindImplementation) external;
    function DEPLOY_KIND_IMPLEMENTATION(bytes24 kind, bytes calldata bytecode) external;

    // register plugins for use within supported clients
    //
    // plugins always reference a thing within the state. ie a plugin for a BuildingKind
    //
    // example:
    //
    //  REGISTER_KIND_PLUGIN(myRandomlyPickedPluginID, myBuildingKindID, "my-plugin", "function(){}")
    //
    function REGISTER_KIND_PLUGIN(
        bytes24 pluginID,
        bytes24 targetKind,
        string calldata name,
        string calldata src,
        bool alwaysActive
    ) external;

    // construct a building
    function CONSTRUCT_BUILDING_MOBILE_UNIT(
        bytes24 mobileUnit, // which mobileUnit is performing the construction
        bytes24 buildingKind, // what kind of building
        int16 q,
        int16 r,
        int16 s // which tile to create on (can be adjacent)
    ) external;

    // use a building
    // this action mostly just proxies through to the building kind implementation (if set)
    function BUILDING_USE(bytes24 buildingID, bytes24 mobileUnitID, bytes calldata payload) external;

    function REGISTER_ITEM_KIND(bytes24 itemKind, string calldata name, string calldata icon) external;

    function CRAFT(
        bytes24 buildingInstance // the building performing CRAFT
    ) external;

    function EXTRACT(
        bytes24 buildingInstance // the building performing EXTRACT
    ) external;

    // spawn a mobileUnit for the sender
    function SPAWN_MOBILE_UNIT(bytes24 mobileUnit) external;

    function START_COMBAT(
        bytes24 mobileUnitID,
        bytes24 tileID,
        bytes24[] calldata attackers,
        bytes24[] calldata defenders
    ) external;

    function FINALISE_COMBAT(
        bytes24 sessionID,
        CombatAction[][] calldata sessionUpdates,
        uint32[] calldata sortedListIndexes
    ) external;

    function NAME_OWNED_ENTITY(bytes24 entity, string calldata name) external;
    function DESCRIBE_OWNED_ENTITY(bytes24 entity, string calldata shortDescription) external;

    function TRANSFER_BAG_OWNERSHIP(bytes24 bag, bytes24 toEntity) external;

    function TRANSFER_BAG(bytes24 bag, bytes24 fromEntity, bytes24 toEntity, uint8 toEquipSlot) external;

    function SPAWN_EMPTY_BAG(bytes24 equipee, uint8 equipSlot) external;

    // Quests

    function REGISTER_QUEST(
        bytes24 quest,
        string calldata name,
        string calldata description,
        bool hasLocation,
        int16 q,
        int16 r,
        int16 s,
        bytes24[] calldata tasks,
        bytes24[] calldata nextQuests
    ) external;

    function REGISTER_TASK(bytes24 task, string calldata name, bytes calldata taskData) external;

    function ACCEPT_QUEST(bytes24 quest, uint8 questNum) external;

    function COMPLETE_QUEST(bytes24 quest, uint8 questNum) external;

    // Parts

    function REGISTER_PART_KIND(bytes24 partKindId, string calldata name, string calldata model) external;

    function REGISTER_PART_ACTION(
        bytes24 partKindId,
        uint8 actionIndex,
        string calldata name,
        string[] calldata argNames,
        uint8[] calldata argTypes,
        bool[] calldata argLists,
        uint256[] calldata argLengths
    ) external;

    function REGISTER_PART_REF(
        bytes24 partKindId,
        uint8 index,
        string calldata name,
        bytes24 refPartKindId,
        bool list,
        uint256 length
    ) external;

    function REGISTER_PART_STATE(
        bytes24 partKindId,
        uint8 index,
        string calldata argName,
        uint8 argType,
        bool argList,
        uint256 argLength
    ) external;

    function REGISTER_PART_ACTION_TRIGGER(
        bytes24 partKindId,
        uint8 triggerIndex,
        uint8 triggerType, // action | state
        bool actionIndex
    ) external;

    function CALL_ACTION_ON_PART(bytes24 partId, bytes24 actionDefId, bytes calldata payload) external;

    function SPAWN_PART(bytes24 partKindId, int16 q, int16 r, int16 s) external;

    // ---------------------
    // the DEV_ actions below this point are not for public use they are
    // only available by a single authorized account and only for a short
    // period after initial world deployment.
    // ---------------------

    // spawn a tile at any location
    function DEV_SPAWN_TILE(int16 q, int16 r, int16 s) external;

    // spawn a building at any location
    function DEV_SPAWN_BUILDING(bytes24 buildingKind, int16 q, int16 r, int16 s) external;

    // spawn a bag with resources equip somewhere
    function DEV_SPAWN_BAG(
        bytes24 bagID,
        address owner,
        bytes24 equipee,
        uint8 equipSlot,
        bytes24[] calldata slotContents,
        uint64[] calldata slotBalances
    ) external;

    // calling DEV_DISABLE_CHEATS will disable cheats this action cannot
    // be undone, DEV_ cheat actions will be disabled and ignored forever
    function DEV_DISABLE_CHEATS() external;

    function SET_DATA_ON_BUILDING(bytes24 buildingID, string memory key, bytes32 data) external;
}

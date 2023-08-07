// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

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

// ---------------- EMBED THE COG INTERFACES ---------------
// TODO: stop duplicating this
// the intension is to have minimal importable interface for the Game
// so that extensions do not need to import the entire ds+cog repo just to write their func
// --------------------------------------------------------

enum WeightKind {
    UINT64,
    INT64,
    BYTES,
    STRING
}

struct GameMetadata {
    string name;
    string url;
}

enum AnnotationKind {CALLDATA}

enum CompoundKeyKind {
    NONE, // key is not expected to be anything other than 0
    UINT160, // key is a single uint64
    UINT8_ARRAY, // key is 20 uint8s
    INT8_ARRAY, // key is 20 int8s
    UINT16_ARRAY, // key is 10 uint16s
    INT16_ARRAY, // key is 10 int16s
    UINT32_ARRAY, // key is 5 uint32s
    INT32_ARRAY, // key is 5 int32s
    UINT64_ARRAY, // key is 2 uint64s
    INT64_ARRAY, // key is 2 int64s
    ADDRESS, // key is 20 byte address
    BYTES, // key is an 20 byte blob of data
    STRING // key is an 20 byte string
}

struct Context {
    address sender; // action sender
    uint32 scopes; // authorized scopes
    uint32 clock; // block at time of action commit
}

interface Dispatcher {
    event ActionRegistered(address id, string name);
    event ActionDispatched(address indexed sender, bytes32 actionNonce);

    function dispatch(bytes calldata action, Context calldata ctx) external;
    function dispatch(bytes[] calldata actions, Context calldata ctx) external;
    function dispatch(bytes calldata action) external;
    function dispatch(bytes[] calldata actions) external;
}

interface Router {
    function dispatch(bytes[][] calldata actionBundles, bytes[] calldata bundleSignatures) external;
    function authorizeAddr(Dispatcher dispatcher, uint32 ttl, uint32 scopes, address addr) external;
    function authorizeAddr(Dispatcher dispatcher, uint32 ttl, uint32 scopes, address addr, bytes calldata sig)
        external;
    function revokeAddr(address addr) external;
    function revokeAddr(address addr, bytes calldata sig) external;
}

interface State {
    event EdgeTypeRegister(bytes4 id, string name, WeightKind kind);
    event NodeTypeRegister(bytes4 id, string name, CompoundKeyKind keyKind);
    event EdgeSet(bytes4 relID, uint8 relKey, bytes24 srcNodeID, bytes24 dstNodeID, uint160 weight);
    event EdgeRemove(bytes4 relID, uint8 relKey, bytes24 srcNodeID);
    event AnnotationSet(bytes24 id, AnnotationKind kind, string label, bytes32 ref, string data);

    function set(bytes4 relID, uint8 relKey, bytes24 srcNodeID, bytes24 dstNodeID, uint64 weight) external;
    function remove(bytes4 relID, uint8 relKey, bytes24 srcNodeID) external;
    function get(bytes4 relID, uint8 relKey, bytes24 srcNodeID)
        external
        view
        returns (bytes24 dstNodeId, uint64 weight);
    function registerNodeType(bytes4 kindID, string memory kindName, CompoundKeyKind keyKind) external;
    function registerEdgeType(bytes4 relID, string memory relName, WeightKind weightKind) external;
    function authorizeContract(address addr) external;
    function annotate(bytes24 nodeID, string memory label, string memory annotationData) external;
}

interface Game {
    event GameDeployed(address dispatcherAddr, address stateAddr, address routerAddr);

    function getMetadata() external returns (GameMetadata memory);
    function getDispatcher() external returns (Dispatcher);
    function getRouter() external returns (Router);
    function getState() external returns (State);
}
// ---------------- END EMBED THE COG INTERFACES ---------------

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
        bytes24[4] calldata materialItem,
        uint64[4] calldata materialQty
    ) external;

    function REGISTER_CRAFT_RECIPE(
        bytes24 buildingKind,
        bytes24[4] calldata inputItem,
        uint64[4] calldata inputQty,
        bytes24 outputItem,
        uint64 outputQty
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
    function REGISTER_KIND_PLUGIN(bytes24 pluginID, bytes24 targetKind, string calldata name, string calldata src)
        external;

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

    function TRANSFER_BAG_OWNERSHIP(bytes24 bag, bytes24 toEntity) external;

    function TRANSFER_BAG(bytes24 bag, bytes24 fromEntity, bytes24 toEntity, uint8 toEquipSlot) external;

    function SPAWN_EMPTY_BAG(bytes24 equipee, uint8 equipSlot) external;

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
